import type {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class ChatAdsApi implements ICredentialType {
    name = 'chatAdsApi';

    displayName = 'ChatAds API';

    properties: INodeProperties[] = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: 'https://app.getchatads.com',
            description:
                'Root domain where the ChatAds FastAPI service (affiliate/chatads_backend.py) is deployed',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'Value to send in the x-api-key header when calling ChatAds',
        },
        {
            displayName: 'Health Check Path',
            name: 'healthCheckPath',
            type: 'string',
            default: '/health',
            description:
                'Relative path to a lightweight GET endpoint for credential testing (set to an endpoint that validates the API key without running the full scoring pipeline)',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'x-api-key': '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            method: 'GET',
            url: '={{($credentials.baseUrl || "").replace(/\/+$/, "") + ((($credentials.healthCheckPath || "/health").startsWith("/")) ? ($credentials.healthCheckPath || "/health") : "/" + ($credentials.healthCheckPath || "/health"))}}',
            qs: {
                source: 'n8n-credential-test',
            },
        },
    };
}
