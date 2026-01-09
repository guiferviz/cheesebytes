The browser is not only here to translate HTML and CSS into nice-looking user
interfaces.

The browser is also here to **protect us**.

This part is easy to forget, because most of the time everything "just works".
But a lot of very deliberate design decisions exist to stop really nasty things
from happening.

Let's tell the story properly.

# A Small Horror Story

Imagine this.

You open a website. It looks harmless. You did not type anything suspicious, you
just clicked a link or landed there from somewhere else.

That website is malicious, but you do not know it.

Inside that page, some JavaScript runs. And here is an important fact:

> **JavaScript can make HTTP requests to any website.**

There is no rule saying "JavaScript can only call the site it came from".

So this malicious page tries something like:

> "Hey, let me call your bank’s website."

Why not? Technically, it can.

Now it gets worse.

Your browser already has cookies for your bank:

- session cookies
- authentication cookies
- maybe remember-me cookies

Those cookies exist **because you previously logged in**, not because this
malicious site did anything clever.

So the obvious scary question appears:

> Why on earth should a random website be allowed to call my bank **using my
> credentials**?

That would be a disaster.

# The Browser Steps In

This is where the browser stops being a dumb renderer and starts acting like a
guard.

The browser knows:

- which page you are currently on (`https://evil-site.com`)
- which site the JavaScript is trying to call (`https://my-bank.com`)
- whether credentials (cookies, Authorization headers, etc.) are involved

And the browser says:

> "Hold on. This smells dangerous."

Depending on **what kind of request** the JavaScript is trying to make, the
browser reacts in different ways.

## Case 1: "This Request Looks Dangerous"

If the JavaScript tries to:

- send credentials
- use an `Authorization` header
- send JSON
- use methods like `PUT`, `PATCH`, `DELETE`
- or do anything beyond a very basic request

Then the browser pauses and asks first.

Literally.

It sends a **preflight request** to the bank:

```
OPTIONS /some-endpoint
Origin: https://evil-site.com
```

This is the browser asking:

> "Hey bank, I am currently on `evil-site.com`.  
> Am I allowed to make this request?"

Now the bank replies:

> "No. Only my own websites are allowed."

And the browser, which is on **your side**, says:

> "Alright. I will not even send the real request."

The dangerous request is **cancelled before it happens**.

The bank never sees it.

You are protected.

## Case 2: "This Looks Simple, I Will Try It"

Some requests are considered "simple":

- plain `GET`
- no special headers
- no authentication headers
- no JSON

An example of a simple request is "Give me the public exchange rates". In this
case, the browser may not ask first.

It sends the request directly.

But when the response comes back, the server includes headers saying things
like:

```
Access-Control-Allow-Origin: https://my-bank.com

Current exachange rate is 1.2 USD/EUR
```

Now the browser checks:

> "I came from `evil-site.com`.  
> Is `evil-site.com` allowed?"

If the answer is no, the browser does something important:

- the request **did happen**
- the server **did respond**
- but **JavaScript is not allowed to read the response**

The browser blocks access to the data.

Again: you are protected.

# Cross-Origin Resource Sharing

This whole mechanism is called **CORS**. **CORS** stands for:

> **Cross-Origin Resource Sharing**

And this is the most important thing to understand:

> **CORS is a browser feature.**

Not a backend feature.  
Not a server firewall.  
Not a security layer you can rely on server-side.

It is the browser saying:

> "I will only let JavaScript read responses if the server allows this origin."

The backend helps by sending headers, but **the browser enforces the rules**.

# Why some APIs allow everyone

Now consider a different example: a weather API. It returns:

- temperature
- rain
- wind

There is no authentication. There is no private data. There is no user session.

In that case, it makes sense for the server to say:

```
Access-Control-Allow-Origin: *
```

Which means:

> "Anyone can call me from anywhere."

That is fine. There is nothing sensitive to protect. Banks, on the other hand,
usually say:

> "Only my own websites are allowed to talk to my backend."

Different use case, different policy.

# Important: CORS does not protect your backend

CORS:

- protects **users**
- protects **browsers**
- protects **JavaScript execution**

But CORS does **not** protect your backend.

If you use:

- Postman
- curl
- a backend service
- a mobile app
- a script

CORS does not exist. Those tools can call any server, anytime. That is
intentional. Otherwise, developers could not work.

So **real security must always live in the backend**:

- authentication
- authorization
- validation
- permissions

CORS is just a **browser-side safety net**.

# The Key Takeaway

The browser is not just a rendering engine.

It is also:

- a gatekeeper
- a bouncer
- a bodyguard

CORS exists because JavaScript is powerful, and power needs limits. So the next
time you see a CORS error, remember:

> The browser is not being annoying.  
> It is doing its job.
