// A server, with nothing else in the way.
//
// This is not part of the reminders app. It exists so you can see what a
// server actually is: a program that starts up and then doesn't stop.
//
// Run it:   node server.js
// Visit:    http://localhost:3000/reminders
// Stop it:  Ctrl-C

// "http" comes with Node. Nothing to install.
const http = require("http");

// Pretend data. A real server would fetch this from a database.
const reminders = [
  { id: 1, title: "Call the dentist", done: false },
  { id: 2, title: "Buy milk", done: true },
];

// This function runs once per request. Somebody asks; we answer.
const server = http.createServer((request, response) => {
  console.log("  <- asked for:", request.method, request.url);

  if (request.url === "/reminders") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(reminders));
  } else {
    // 404 is the same "not found" a browser shows you. It's just a number
    // the server picks to describe how the request went.
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "no such thing here" }));
  }
});

// The important line. It claims port 3000 and then waits, forever, until
// you stop it. That waiting is the whole difference between this and app.js.
server.listen(3000);
console.log("Listening on port 3000. Waiting for someone to ask something.");
