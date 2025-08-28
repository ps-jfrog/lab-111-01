import { PlatformContext, PlatformClients, PlatformHttpClient } from 'jfrog-workers';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import runWorker from './worker';
import { PlatformSecrets } from './types';

describe("notification tests", () => {
    let context: DeepMocked<PlatformContext>;
    let request: any;

    beforeEach(() => {
        context = createMock<PlatformContext>({
            clients: createMock<PlatformClients>({
                platformHttp: createMock<PlatformHttpClient>({
                    get: jest.fn().mockResolvedValue({ status: 200 })
                })
            }),
            secrets: createMock<PlatformSecrets>({
                get: jest.fn().mockReturnValue('secret')}) 
        });
        request = {};
    })

    it('should run', async () => {
        await expect(runWorker(context, request)).resolves.toEqual(expect.objectContaining({
            message: expect.anything(),
        }))
    })

    // test('the data is peanut butter', async () => {
    //     const data = await sendTeamsMessage();
    //     expect(data).toBe('peanut butter');
    //   });
      
});