# A tiny server

Not part of the reminders app. A 20-line program you can run on your own
laptop, so "server" stops being an abstract word.

## Run it

You need Node installed (`node --version` to check). Then, from this folder:

```sh
node server.js
```

It prints `Listening on port 3000` and then appears to hang. It hasn't hung —
that's it working. It's waiting.

Leave it running and open <http://localhost:3000/reminders> in a browser.
You'll see raw data, no page:

```json
[{"id":1,"title":"Call the dentist","done":false}, ...]
```

Now try <http://localhost:3000/bananas>. You get a 404 — the server deciding
it doesn't have that.

Look back at the terminal. It logged both requests as they arrived. That's
your browser and this program talking to each other.

Press Ctrl-C to stop it. Reload the page and it fails to connect: no program
listening, no answer.

## What to notice

**It doesn't exit.** `app.js` runs top to bottom and finishes. This one reaches
`server.listen(3000)` and waits forever. That's what makes it a server.

**`localhost` means this machine.** Only you can reach it. Deploying means
running the same file on a rented machine that has a public address — the code
doesn't change, the computer does.

**`3000` is a port.** One machine can run many listening programs, so each
claims a numbered door.

**A URL isn't a webpage.** `/reminders` returns data with no HTML in it.
Turning data into something worth looking at is the browser's job — that's
what `app.js` does.

## How this relates to the real app

The reminders app never needed this, because Supabase runs the equivalent
program on your behalf. When `app.js` calls:

```js
db.from("reminders").select("*")
```

a request very much like the one above goes to a machine Supabase owns, a
program there decides what to send back, and the answer comes home. You just
never had to write that program.
