# Dating Party Analogy

Every token (a word, or a piece of text) is like a single person at a party.
Each one is looking around, trying to decide who to pay attention to.

But they do not just randomly flirt; they do it through profiles.

## 💌 Step 1 - Everyone builds their profiles

Each token creates three profiles from its hidden vector:

- **Query (Q)**: what I am looking for in others.
- **Key (K)**: what I offer to others.
- **Value (V)**: what I share if someone connects with me.

You can think of it like Tinder bios:

The Query is your dating preferences ("I like funny people who talk about
cheese").

The Key is your public bio ("I am funny and I love cheese!").

The Value is what you will actually bring to the date if matched (your stories,
your humor, a list of your favourite cheeses).

## 💫 Step 2 - Swiping

Now each person (token) swipes through everyone else's profiles.

They compare their Query to everyone else's Key.

The dot product between Query and Key is the chemistry score: how compatible
they seem.

If you have a high score, that means "this person fits what I am looking for".

## 🔥 Step 3 - Choosing whom to focus on

Each token applies a softmax over those chemistry scores — turning them into
"how much attention do I give to each person?"

So if one person's Key fits your Query really well, you will focus mostly on
them.

## 💞 Step 4 - Getting the actual information

Finally, once you have decided who to pay attention to, you do not take their
overview of the personality (Key); you take their Value (the part they are
willing to share).

You mix together everyone's Values, weighted by how much attention you gave
them. That becomes your new representation: the sum of everything you have
learned from your matches.

## 🧠 Step 5 - Next round

Now every token has updated itself after socializing. In the next layer, they
all go back to the party with new context (each one now knows a bit more about
what everyone else said).

✨ Summary Role Dating analogy In transformer Query (Q) What I am looking for
Defines who I pay attention to Key (K) My profile / what I offer Lets others
find me if I match their Query Value (V) What I share on the date The info that
gets passed if someone pays attention

## Summary

| Role          | Dating analogy            | In transformer                                      |
| ------------- | ------------------------- | --------------------------------------------------- |
| **Query (Q)** | What I am looking for     | Defines who I pay attention to                      |
| **Key (K)**   | My profile / what I offer | Lets others find me if I match their Query          |
| **Value (V)** | What I share on the date  | The info that gets passed if someone pays attention |

# A Real NLP Example: Resolving "She"

Let's say a sentence goes:

    Maria took her dog to the park because she loves nature.

When the model sees "she", it needs to decide: Who is "she"?

"She" becomes a token with a query: "I am looking for someone feminine".

"Maria" has a key that says, "I am a feminine noun and likely to be a person."

If the query of "she" matches the key of "Maria", attention is high.

So Maria gets selected, and then:

The model uses that value to update the embedding of "she", effectively
resolving the pronoun to its referent and enriching it with meaning.

In higher layers, this process can get more complex, potentially asking more
complex questions. For example, another query for "she" might be "I am looking
for someone who loves nature". If "Maria" has a key indicating she loves nature,
the attention mechanism will again highlight "Maria" as the referent for "she".
More generally, Maria's value vector provides the context: all the information
about Maria the model has seen so far, like her role, position, and features in
the sentence.
