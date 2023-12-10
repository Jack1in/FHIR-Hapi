const Hapi = require("hapi");
const Session = require("hapi-server-session");
const smart = require("fhirclient/lib/entry/hapi");

// The settings that we use to connect to our SMART on FHIR server
const smartSettings = {
  clientId: "741abf75-0a36-4f95-8616-e5f4055e016d",
  redirectUri: "/app",
  scope: "patient/Patient.read openid fhirUser",
};


// Just a simple function to reply back with some data (the current patient if
async function handler(client, h) {
  try{
    const data = await (client.patient.id
      ? client.patient.read()
      : client.request("Patient"));
    return h.response(JSON.stringify(data, null, 4)).type("application/json");
  }
  catch(err){
    console.log(err);
    return h.response(JSON.stringify(err, null, 4)).type("application/json");
  }
}

const init = async () => {
  let server;
  try {
    // Create a new Hapi server on localhost port 8080
    server = Hapi.server({
      port: 8080,
      host: "localhost",
      debug: {
        request: ['error', 'uncaught'],
        log: ['error', 'uncaught']
    }
    });
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }

  // register the session plugin with the server
  // session is used to store the state of the client
  try {
    await server.register({
      plugin: Session,
      options: {
      expiresIn: 1000 * 60 * 5,
      cookie: {
        isSecure: false // set true in 
      }
    }
    });
    console.log('Session plugin registered');
  }
  catch (err) {
    console.error('Failed to load plugin:', err);
  }

  // our launch uri
  try
  { 
    server.route({
    method: "GET",
    path: "/",
    handler: async (request, h) => {
      return smart(request, h).authorize(smartSettings);
    }
    });
    console.log('Launch uri registered');
  }
  catch(err)
  {
    console.log("Failed to register launch uri");
  }

  // our redirect uri
  try{
    server.route({
      method: "GET",
      path: "/app",
      handler: async (request, h) => {
        // handler will be called here
        return smart(request, h).ready((client) => handler(client, h));
      }
    });
    console.log('Redirect uri registered');
  }
  catch(err)
  {
    console.log("Failed to register redirect uri");
  }

  try{
    await server.start();
    console.log("Server started at " + server.info.uri);
  }
  catch(err)
  {
    console.log(err);
  }
};

process.on("unhandledRejection", (err) => {
  console.log("unhandledRejection");
  console.log(err);
  process.exit(1);
});

init();
