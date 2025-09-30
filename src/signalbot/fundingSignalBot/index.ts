export const handler = async (event: any): Promise<any> => {
  try {

    const now = new Date();

    return {
      statusCode: 200,
      body: JSON.stringify({ event, time: now.toISOString() }),
    };
  } catch (error:any) {
    console.error("Error processing event:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error?.message && error,
      }),
    };
  }
};
