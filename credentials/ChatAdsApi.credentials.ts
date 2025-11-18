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
        }
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
            url: '={{($credentials.baseUrl || "").replace(/\/+$/, "") || "https://app.getchatads.com"}}',
            qs: {
                source: 'n8n-credential-test',
            },
        },
    };
}
