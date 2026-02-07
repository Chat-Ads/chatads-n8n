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
            default: 'https://api.getchatads.com',
            description:
                'ChatAds API endpoint URL',
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
            url: '={{($credentials.baseUrl || "").replace(/\/+$/, "") || "https://api.getchatads.com"}}/v1/auth/verify',
        },
    };
}
