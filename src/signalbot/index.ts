export const handler = async (event: any): Promise<any> => {

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: No body provided", event }),
    };
  }
  const now = new Date();
  const message = event.body;

  return {
    statusCode: 200,
    body: JSON.stringify({ message, time: now.toISOString() }),
  };
};
