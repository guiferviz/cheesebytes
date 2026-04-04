The CheeseBytes website offers more than you can see on the surface. Your
keyboard is your best friend when it comes to navigating the depths of our
content. And when it comes to using the keyboard, Vim is king. So at
CheeseBytes, we took inspiration from Vim to create a navigation mode that lets
you move around the site more easily and toggle features on or off without the
need for cluttered interfaces.

If you look at the bottom right of the page, you will see a small label that,
most likely, says `NORMAL`. That means you are in the normal navigation mode.
This mode has certain commands that you can use on any page of the site. To see
those commands, you just need to press the `?` key. You will see a menu listing
the available commands.

In general, the label shows the current mode, but it can also display additional
information, such as an active command that is waiting for a parameter.

# Modes

These are the main modes:

- `NORMAL`: The default mode. Here you can use navigation commands and
  shortcuts.
- `INSERT`: Activated automatically when you are typing in a field. Here you can
  type freely without triggering navigation commands. To return to NORMAL, press
  Escape.
- `IFRAME`: Activated automatically when the focus is inside an iframe. Here
  Cheese Bytes has nothing to do, so it hands control over to the iframe. The
  only way to leave this mode is to click outside the iframe and return to
  NORMAL.
- Custom modes: Some components can activate custom modes to handle specific
  interactions. For example, a game might activate `GAME` mode to list commands
  related to the game. These custom modes are shown in the label and have their
  own command list, accessible with `?` while you are in that mode.

# Easter Egg

Try pressing `c` while in normal mode. It starts a command that waits for a
short time for the next key. While it is waiting, you should see the keys appear
next to the mode label as they are being combined.

If you discover the right word, something will happen.

If you find the hidden command, feel free to leave a comment, but please do not
spoil it for everyone else.
