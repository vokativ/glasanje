import * as functions from 'firebase-functions';

// This separately packaged hello-world endpoint is not evidence of an application backend.
 export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
  });
