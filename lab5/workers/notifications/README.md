# Notification service

## Purpose 
This is a worker implementation that acts as a service and sends notifications to Slack channels or DM's based on a  custom input payload:

```
{
    title: `Message title`,
    message: `This ius the message body`,
    botName: 'Curation Policy Violation',
    url: `${payload.jpd_origin}/ui/package-curation/audit`,
    email: payload.data.user_mail,
    note: 'This is a test message'
};
```

This will result in a richer message with the actual message format controlled by the template used. In this example its defined in `slackMessageTemplate` in the worker code resulting in a message as follows:

![alt text](example-message.png)
The

These notifications can be triggered from external events as well as simulated events (eg: [dry run worker](../dry-run-handler/)) in cases where the system does not generate events. The service can be used in multiple configurations either as multiple seperate services or together as a single worker servicing all events.

This is example code intended to get started and still needs to be tested and hardended.

## Configuration
Secrets were leveraged for external configuration. These are obtained by calling `context.secrets.get('secretName')` and will need to be modified to support your configuration.

|Secret|Default value|
|---|---|
|slackToken|no usable value|
|slackChannel|no usable value|
|debug|false|

### Slack
In order to message in slack an app needs to be created. This app requires the following permissions:

|Permission|Purpose|
|--------|-------|
|chat:write|Allows sending of messages as the bot|
|chat:write.public|Allows sending messages to channels the bot isn't a member of|
|users:read.email|View email addresses of people in a workspace|
|users:read|Lookup member id's from email so we can send DM's to users|

In addition you will require an oauth token from the app/bot you created. This needs to be either installed as a secret in the worker definition ```jf worker as``` which will add an encrypted version into your [manifect file](./manifest.json) or remeber to add a secret after the worker is installed. This could be through the [ui](https://jfrog.com/help/r/jfrog-platform-administration-documentation/configure-event-driven-workers-for-artifactory), [rest api](https://jfrog.com/help/r/jfrog-rest-apis/create-worker) or [terraform](https://jfrog.com/help/r/jfrog-platform-administration-documentation/step-1-configure-jfrog-credential-for-terraform-provider). Secrets added in the code are encrypted in ```manifest.json``` and will require the password used when adding it to do a deployment into your artifactory instance. 

The messages are in Slacks' [BlockKit](https://api.slack.com/block-kit) format which has been made the same as the MS teams template.  Message templates can be edited or verified using the [online editor](https://app.slack.com/block-kit-builder/)

