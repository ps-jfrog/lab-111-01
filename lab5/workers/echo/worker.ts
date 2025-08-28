import { PlatformContext } from 'jfrog-workers';

type CustomPayload = void;

interface CustomResponse {
  message: string | undefined; // Valued with the cause in case of error
}

export default async (
  context: PlatformContext,
  data: CustomPayload
): Promise<CustomResponse> => {
  const response = {
    message: undefined
  };

  try {
      console.log(JSON.stringify(data));
  } catch (error) {
    response.message = `Request failed with status code ${error.status || "<none>"} caused by : ${error.message}`;
    console.error(response.message);
  }

  return response;
};