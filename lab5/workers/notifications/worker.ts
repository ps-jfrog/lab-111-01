import { PlatformContext } from 'jfrog-workers';
import { AxiosInstance } from 'axios';

let DEBUG = false; 

type CustomPayload = void;
type CustomResponse = {
    message: string,
    error: string | undefined,
    data: Record<string, number>, 
    status: string
};

// Unified interface for the message data
interface MessageData {
    title: string;
    message: string;
    botName: string;
    url: string;
    email: string;
    note: string;
    policyName?: string;
    watchName?: string;
    alertId?: string;
    issues?: Array<{
        vulnerabilityId: string;
        severity: string;
        type: string;
        summary: string;
        impactedArtifacts: Array<{
            name: string;
            displayName: string;
        }>;
    }>;
}

// This worker responds to fowarded blocking events from either curation, xray or using curations audit logs
export default async (context: PlatformContext, data: CustomPayload): Promise<CustomResponse> => {
    let response: CustomResponse = {
        message: '',
        error: undefined,
        data: {},
        status: 'SUCCESS'
    };

    try {
        console.log('Running notification processor');

        // NOTE: The slack token is externalized in 1Password whcih may not work in your environment
        const slackToken = getProperty(context, 'slackToken', 'op://Employee/slackToken/Section_4cpskzryw65wp4swm6us2pweum/token-value'); 
        const slackChannel = getProperty(context, 'slackChannel', 'C08F6AFFHND'); 
        DEBUG = getProperty(context, 'debug', 'false') === 'true'; // Allow debug to be overridden by the secret

        let payload: MessageData;

        // Check if this was triggered by curation event, JAS or we're polling audit logs
        if (isMessage(data)) {
            payload = data;
            // Send the message to Slack channel
            await sendSlackMessage(context, data, slackToken, slackChannel, response).catch(console.error);

            // Send a DM
            if (payload.email && payload.email.trim()) {
                const id = await getMemberIdByEmail(context, payload.email, slackToken, response);
                if (id) {
                    debugLog(`Sending DM to ${payload.email} with id: ${id}`);
                    // console.log(`${rawMessageData.email} is member id: ${id}`);
                    try {
                        await sendSlackMessage(context, payload, slackToken, id, response);
                    } catch (error) {
                        console.error('Error sending Slack message:', error);
                    }
                } else {
                    console.log(`No valid member ID found for email: ${payload.email}`);
                }
            } else {    
                console.log('No email available for DM notification');
            }
        }
        else {
            console.log(`Unable to process payload: ${JSON.stringify(data)}`); // Log the payload for debugging
        }
    } catch (error) {
        console.error(
            `Request failed with status code ${error.status || "<none>"
            } caused by : ${error.message}`
        );

        response.error = `Request failed with status code ${error.status || '<none>'} caused by : ${error.message}`;
        response.message = 'Worker failed to process event';
        response.data = {};
        response.status = 'FAILURE';
    }

    return response;
};

// Type guard for curation payloads
function isMessage(payload: any): payload is MessageData {
    return (
        typeof payload === 'object' &&
        'message' in payload &&
        'botName' in payload
    );
}

// TODO: Move template to an external repo
// Slack message template in Block Kit format
const slackMessageTemplate = {
    blocks: [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*{{MESSAGE_TITLE}}*"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*{{BOT_NAME}}*"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "{{MESSAGE}}"
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "{{BOT_NAME}}"
                    },
                    "url": "{{URL}}",
                    "action_id": "action_jfrog_platform_prod"
                }
            ]
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "{{NOTE}}"
                }
            ]
        }
    ]
}

// Send a message to a Slack channel
async function sendSlackMessage(context: PlatformContext, rawMessageData: MessageData, slackToken: string, slackChannel: string, response: CustomResponse): Promise<void> {
    const slackUrl = 'https://slack.com/api/chat.postMessage';

    debugLog(`Sending Slack message to ${slackChannel}`);

    // Replace placeholders in the message template
    const msg = await replaceTokens(slackMessageTemplate, rawMessageData);

    if (DEBUG) {
        debugLog('Slack message: ' + JSON.stringify(msg));
    }

    if (msg) {
        try {
            const result = await context.clients.axios.post(
                slackUrl,
                {
                    channel: slackChannel,
                    blocks: getValueFromJSON(msg, 'blocks')
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${slackToken}`,
                    },
                }
            );
    
            if (DEBUG) {
                debugLog('Slack POST: ' + JSON.stringify(result));
            }
        
            if (result.data.ok) {
                debugLog(`Slack: Message sent successfully to ${slackChannel}`);    
                response.message += `Message sent to Slack channel ${slackChannel}\n`;
            } else {
                console.error(`Slack failed to send message to ${slackChannel}`, response.data.error);
                response.message += `Slack failed to send message to ${slackChannel}\n`;
                console.error('Slack API Error:', result);
            }
        } catch (error) {
            console.error('Slack: Error sending message:', error);
            response.error += `Slack: Error sending message: ${error}\n`;
            response.status = 'FAILURE';
        }
    } else {
        // Handle case where msg is undefined or empty
        console.error('Slack: Message is empty or undefined. Not sending.');
        response.error += `Slack: Message is empty or undefined. Not sending.\n`;
        response.status = 'FAILURE';
    }
}

// Helper wrapped with debug flag as we don't want to waste time
function debugLog(logMessage: string) {
    if (DEBUG) {
        console.log(logMessage);
    }
}

// Replace tokens in the message template
function replaceTokens(messageTemplate: any, rawMessageData: MessageData) {
    let hydratedMessage;
    try {
        debugLog('Replacing tokens in message template: ' + JSON.stringify(messageTemplate));
        debugLog('Raw data: ' + JSON.stringify(rawMessageData));

        let message = JSON.stringify(messageTemplate);

        message = message.replace(/{{MESSAGE_TITLE}}/g, getValueFromJSON(rawMessageData, 'title') || 'No Title');
        message = message.replace(/{{MESSAGE}}/g, getValueFromJSON(rawMessageData, 'message') || 'No Message');
        message = message.replace(/{{BOT_NAME}}/g, getValueFromJSON(rawMessageData, 'botName') || 'Unknown Bot');
        message = message.replace(/{{URL}}/g, getValueFromJSON(rawMessageData, 'url') || '#');
        message = message.replace(/{{NOTE}}/g, getValueFromJSON(rawMessageData, 'note') || 'No Note');

        // Validate that all placeholders have been replaced before parsing
        if (message.includes('{{')) {
            throw new Error('Failed to replace all placeholders in the message template');
        }

        hydratedMessage = JSON.parse(message);

        debugLog(hydratedMessage);
    } catch (error) {
        console.error(`Error replacing tokens in the message template. Raw message data: ${JSON.stringify(rawMessageData)}, Template: ${JSON.stringify(messageTemplate)}, Error: ${error.message}`);
        if (hydratedMessage && Object.keys(hydratedMessage).length > 0) {
            console.log(hydratedMessage);
        }
        if (!hydratedMessage) {
            throw new Error(`Failed to replace tokens in the message template: ${error.message}`);
        }
    }
    return hydratedMessage;
}

type JSONObject = { [key: string]: any };

const getValueFromJSON = (obj: JSONObject, path: string): any => {
    const keys = path.split('.').map(key => {
        const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            return { key: arrayMatch[1], index: parseInt(arrayMatch[2]) };
        }
        return { key, index: null };
    });

    let result: any = obj;

    for (const { key, index } of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
            if (index !== null) {
                if (Array.isArray(result) && index < result.length) {
                    result = result[index];
                } else {
                    return undefined;  // Return undefined if index is out of range or not an array
                }
            }
        } else {
            return undefined;  // Return undefined if the path is not valid
        }
    }

    return result;
};

// For DM's we need to get slack member ID's not channel numbers
async function getMemberIdByEmail(context: PlatformContext, email: string, token: string, response?: CustomResponse): Promise<string> {
    try {
        const result = await context.clients.axios.get('https://slack.com/api/users.lookupByEmail', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: { email }
        });

        const data = result.data;
        if (!data.ok) {
            throw new Error(`Slack API error: ${data.error}`);
        }

        return data.user.id;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        response.status = 'FAILURE';
        return ''; // Return an empty string as a fallback value
    }
}

// Get the property from the context or fallback to a default value
function getProperty(context: PlatformContext, propertyName: string, defaultValue?: any): any {
    let value: any = null;
    try {
        value = context.secrets.get(propertyName);
    } catch (error) {
        // Ignore its not been overridden - not the greatest but this is how it works for now            
        value = defaultValue; // Fallback to default if the secret cannot be retrieved
    }

    debugLog(`Retrieved property '${propertyName}': ${value !== null && value !== undefined ? value : 'not set, using default'}`);

    return value;
}