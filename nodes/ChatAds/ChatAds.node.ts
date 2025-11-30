import type {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const DEFAULT_ENDPOINT = '/v1/chatads/messages';

const OPTIONAL_FIELDS = new Set([
    'pageUrl',
    'pageTitle',
    'referrer',
    'address',
    'email',
    'type',
    'domain',
    'ip',
    'reason',
    'company',
    'name',
    'country',
    'override_parsing',
    'response_quality',
]);

const FIELD_ALIASES: Record<string, string> = {
    pageurl: 'pageUrl',
    page_url: 'pageUrl',
    pagetitle: 'pageTitle',
    page_title: 'pageTitle',
    overrideparsing: 'override_parsing',
    override_parsing: 'override_parsing',
    responsequality: 'response_quality',
    response_quality: 'response_quality',
};

const RESERVED_PAYLOAD_KEYS = new Set(['message', ...OPTIONAL_FIELDS]);

const isPlainObject = (value: unknown): value is IDataObject =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeJsonPath = (path: string): string =>
    path.startsWith('/') ? path : `/${path}`;

const parseJsonObject = (
    context: IExecuteFunctions,
    value: IDataObject | string,
    fieldName: string,
    itemIndex: number,
): IDataObject => {
    let parsed: unknown = value;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return {};
        }

        try {
            parsed = JSON.parse(trimmed);
        } catch (error) {
            throw new NodeOperationError(
                context.getNode(),
                `${fieldName} must be valid JSON`,
                { itemIndex },
            );
        }
    }

    if (!isPlainObject(parsed)) {
        throw new NodeOperationError(
            context.getNode(),
            `${fieldName} must be a JSON object`,
            { itemIndex },
        );
    }

    return parsed;
};

const coerceToString = (
    context: IExecuteFunctions,
    source: string,
    key: string,
    value: unknown,
    itemIndex: number,
): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    throw new NodeOperationError(
        context.getNode(),
        `${source} field "${key}" must be a string or primitive`,
        { itemIndex },
    );
};

const ensureMessage = (
    context: IExecuteFunctions,
    value: unknown,
    itemIndex: number,
): string => {
    if (typeof value !== 'string') {
        throw new NodeOperationError(
            context.getNode(),
            'Field "message" must be provided as a string',
            { itemIndex },
        );
    }

    const trimmed = value.trim();

    if (!trimmed) {
        throw new NodeOperationError(
            context.getNode(),
            'Field "message" cannot be empty',
            { itemIndex },
        );
    }

    return trimmed;
};

const normalizeFieldKey = (key: string): string => FIELD_ALIASES[key.toLowerCase()] ?? key;

const normalizeOptionalField = (key: string): string | undefined => {
    const normalized = normalizeFieldKey(key);
    if (OPTIONAL_FIELDS.has(normalized)) {
        return normalized;
    }
    return undefined;
};

const assertNoReservedConflicts = (
    context: IExecuteFunctions,
    source: string,
    extras: IDataObject,
    itemIndex: number,
): void => {
    const conflicts = Object.keys(extras).filter((key) => RESERVED_PAYLOAD_KEYS.has(normalizeFieldKey(key)));
    if (conflicts.length > 0) {
        throw new NodeOperationError(
            context.getNode(),
            `${source} contains reserved keys: ${conflicts.join(', ')}`,
            { itemIndex },
        );
    }
};

const buildPayloadFromObject = (
    context: IExecuteFunctions,
    input: IDataObject,
    source: string,
    itemIndex: number,
): IDataObject => {
    const payload: IDataObject = {};
    const extras: IDataObject = {};

    const message = ensureMessage(context, input.message, itemIndex);
    payload.message = message;

    for (const [rawKey, rawValue] of Object.entries(input)) {
        if (rawKey === 'message') {
            continue;
        }
        if (rawValue === undefined || rawValue === null || rawValue === '') {
            continue;
        }

        const optionalKey = normalizeOptionalField(rawKey);
        if (optionalKey) {
            if (optionalKey === 'override_parsing') {
                if (typeof rawValue !== 'boolean') {
                    throw new NodeOperationError(
                        context.getNode(),
                        `${source} field "${rawKey}" must be a boolean`,
                        { itemIndex },
                    );
                }
                payload[optionalKey] = rawValue;
                continue;
            }
            payload[optionalKey] = coerceToString(context, source, rawKey, rawValue, itemIndex);
            continue;
        }

        extras[rawKey] = rawValue;
    }

    assertNoReservedConflicts(context, source, extras, itemIndex);
    Object.assign(payload, extras);
    return payload;
};

const buildErrorPayload = (error: unknown): IDataObject => {
    const fallback: IDataObject = {
        message: 'Unknown error',
    };

    if (error instanceof NodeApiError || error instanceof NodeOperationError) {
        fallback.message = error.message;
        if (error.description) {
            fallback.description = error.description;
        }
        if ('httpCode' in error && error.httpCode) {
            fallback.httpCode = error.httpCode;
        }
        if (error.cause instanceof Error) {
            fallback.cause = error.cause.message;
        }
        return fallback;
    }

    if (error instanceof Error) {
        fallback.message = error.message;
        return fallback;
    }

    if (isPlainObject(error)) {
        fallback.message = JSON.stringify(error);
    }

    return fallback;
};

export class ChatAds implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ChatAds',
        name: 'chatAds',
        icon: 'file:chatads.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Wrapper around the ChatAds FastAPI prospect scoring endpoint',
        defaults: {
            name: 'ChatAds',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'chatAdsApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Analyze Prospect',
                        value: 'analyze',
                        description: 'POST to /v1/chatads/messages',
                    },
                ],
                default: 'analyze',
            },
            {
                displayName: 'JSON Parameters',
                name: 'jsonParameters',
                type: 'boolean',
                default: false,
                description: 'Provide the request body as raw JSON instead of individual fields',
            },
            {
                displayName: 'Body',
                name: 'bodyJson',
                type: 'json',
                default: '{}',
                required: true,
                typeOptions: {
                    alwaysOpenEditWindow: true,
                },
                displayOptions: {
                    show: {
                        jsonParameters: [true],
                    },
                },
                description: 'Full FunctionItem payload to send to ChatAds',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        jsonParameters: [false],
                    },
                },
                description: 'Prospect message or query to analyze',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                displayOptions: {
                    show: {
                        jsonParameters: [false],
                    },
                },
                options: [
                    {
                        displayName: 'Page URL',
                        name: 'pageUrl',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Page Title',
                        name: 'pageTitle',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Referrer',
                        name: 'referrer',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Address',
                        name: 'address',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Email',
                        name: 'email',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Type',
                        name: 'type',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Domain',
                        name: 'domain',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'IP Address',
                        name: 'ip',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Reason',
                        name: 'reason',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Company',
                        name: 'company',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Country',
                        name: 'country',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Override Parsing',
                        name: 'override_parsing',
                        type: 'boolean',
                        default: false,
                        description: 'Force parsing on/off regardless of heuristics',
                    },
                    {
                        displayName: 'Response Quality',
                        name: 'response_quality',
                        type: 'options',
                        options: [
                            { name: 'High', value: 'high' },
                            { name: 'Normal', value: 'normal' },
                            { name: 'Low', value: 'low' },
                        ],
                        default: 'normal',
                        description: 'Ask ChatAds to bias toward higher or lower fidelity responses',
                    },
                    {
                        displayName: 'Extra Fields (JSON)',
                        name: 'extraFieldsJson',
                        type: 'json',
                        typeOptions: {
                            alwaysOpenEditWindow: true,
                        },
                        default: '{}',
                        description: 'Raw JSON object merged into the payload as-is',
                    },
                ],
            },
            {
                displayName: 'Endpoint Override',
                name: 'endpoint',
                type: 'string',
                default: DEFAULT_ENDPOINT,
                description: 'Relative path to append to the base URL',
            },
            {
                displayName: 'Max Concurrent Requests',
                name: 'maxConcurrency',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                    maxValue: 50,
                },
                default: 4,
                description: 'Upper bound for simultaneous HTTP calls (set to 1 to process sequentially)',
            },
            {
                displayName: 'Request Timeout (seconds)',
                name: 'timeoutSeconds',
                type: 'number',
                typeOptions: {
                    minValue: 5,
                    maxValue: 300,
                },
                default: 30,
                description: 'Abort the ChatAds request if the server has not responded within this window',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();

        const credentials = await this.getCredentials('chatAdsApi');
        if (!credentials) {
            throw new NodeOperationError(this.getNode(), 'Missing ChatAds API credentials');
        }

        const baseUrl = ((credentials.baseUrl as string) || '').replace(/\/+$/, '');

        if (!baseUrl) {
            throw new NodeOperationError(this.getNode(), 'Base URL is missing in the credentials');
        }

        const continueOnFail = this.continueOnFail();
        const timeoutSeconds = this.getNodeParameter('timeoutSeconds', 0, 30) as number;
        const maxConcurrency = this.getNodeParameter('maxConcurrency', 0, 4) as number;
        const timeoutMs = Math.max(5000, Math.floor(timeoutSeconds * 1000));
        const concurrencyLimit = Math.max(1, Math.min(50, Math.floor(maxConcurrency) || 1));

        const responses: Array<INodeExecutionData | undefined> = new Array(items.length);
        const executing: Promise<void>[] = [];

        const processItem = async (itemIndex: number): Promise<void> => {
            try {
                const operation = this.getNodeParameter('operation', itemIndex) as string;
                if (operation !== 'analyze') {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Unsupported operation "${operation}"`,
                        { itemIndex },
                    );
                }

                const endpointParameter =
                    (this.getNodeParameter('endpoint', itemIndex) as string) || DEFAULT_ENDPOINT;
                const normalizedEndpoint = normalizeJsonPath(endpointParameter);
                const url = `${baseUrl}${normalizedEndpoint}`;

                const jsonParameters = this.getNodeParameter('jsonParameters', itemIndex) as boolean;
                let body: IDataObject;

                if (jsonParameters) {
                    const bodyJson = this.getNodeParameter('bodyJson', itemIndex) as IDataObject | string;
                    const parsedBody = parseJsonObject(this, bodyJson, 'Body JSON', itemIndex);
                    body = buildPayloadFromObject(this, parsedBody, 'Body JSON', itemIndex);
                } else {
                    const rawMessage = this.getNodeParameter('message', itemIndex) as string;
                    const message = ensureMessage(this, rawMessage, itemIndex);
                    const additionalFields = this.getNodeParameter(
                        'additionalFields',
                        itemIndex,
                        {},
                    ) as IDataObject;

                    const constructed: IDataObject = { message };
                    for (const [field, value] of Object.entries(additionalFields)) {
                        if (value === undefined || value === null || value === '') {
                            continue;
                        }

                        if (field === 'extraFieldsJson') {
                            const parsedExtras = parseJsonObject(
                                this,
                                value as IDataObject | string,
                                'Extra fields JSON',
                                itemIndex,
                            );
                            assertNoReservedConflicts(this, 'Extra fields JSON', parsedExtras, itemIndex);
                            for (const [extraKey, extraValue] of Object.entries(parsedExtras)) {
                                if (extraValue === undefined || extraValue === null) {
                                    continue;
                                }
                                if (extraKey === 'message') {
                                    continue;
                                }
                                constructed[extraKey] = extraValue;
                            }
                            continue;
                        }

                        const normalizedKey = normalizeOptionalField(field);
                        if (!normalizedKey) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Field "${field}" is not supported`,
                                { itemIndex },
                            );
                        }

                        if (normalizedKey === 'override_parsing') {
                            if (typeof value !== 'boolean') {
                                throw new NodeOperationError(
                                    this.getNode(),
                                    `Field "${field}" must be provided as a boolean`,
                                    { itemIndex },
                                );
                            }
                            constructed[normalizedKey] = value;
                            continue;
                        }

                        constructed[normalizedKey] = coerceToString(
                            this,
                            'Additional fields',
                            field,
                            value,
                            itemIndex,
                        );
                    }

                    body = buildPayloadFromObject(this, constructed, 'Additional fields', itemIndex);
                }

                const response = await this.helpers.httpRequestWithAuthentication.call(
                    this,
                    'chatAdsApi',
                    {
                        method: 'POST',
                        url,
                        body,
                        json: true,
                        timeout: timeoutMs,
                    },
                );

                responses[itemIndex] = {
                    json: response as IDataObject,
                    pairedItem: {
                        item: itemIndex,
                    },
                };
            } catch (error: unknown) {
                if (continueOnFail) {
                    responses[itemIndex] = {
                        json: buildErrorPayload(error),
                        pairedItem: {
                            item: itemIndex,
                        },
                    };
                    return;
                }

                throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
            }
        };

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let execPromise: Promise<void>;
            execPromise = processItem(itemIndex).finally(() => {
                const promiseIndex = executing.indexOf(execPromise);
                if (promiseIndex !== -1) {
                    executing.splice(promiseIndex, 1);
                }
            });
            executing.push(execPromise);

            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);

        const returnData = responses.filter(
            (entry): entry is INodeExecutionData => entry !== undefined,
        );

        return this.prepareOutputData(returnData);
    }
}
