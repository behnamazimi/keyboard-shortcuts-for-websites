# Keyboard Shortcuts for Websites

**[Chrome Web Store](https://chrome.google.com/webstore/detail/keyboard-shortcuts-for-websites/dgigbgdgmhhncfgaidcbmafkcmagkool)**

With **Keyboard Shortcuts for Websites**, you can define custom keyboard shortcuts for certain actions of websites you
use frequently.

FYI:
> Because of new policies, it's impossible to inject Javascript codes and run it on a website, so I decided to remove
> the functionality of adding shortcuts for executing scripts which was available on previous version.

> The name of the extension changed from "In-site Shortcuts" to "Keyboard Shortcuts for Websites"

You can export your custom keyboard shortcuts and share it with your friend or your teammate.

For the shortcut, you can specify any key combination. Here are some examples:

- `ctrl + shift + e`
- `alt + ctrl + shift + u`
- `shift + %`
- `a + b`
- `1 + 2 + k`
- `p`

Keys determination is order sensitive, it means the same pressed keys in different orders would consider as two
different shortcuts. e.g `a + b + c` is not same as `c + b + a`.

### How It Works

There is two type of shortcuts, **click shortcut** and **script shortcut**.
When you want to add a **click shortcut** it will listen to your clicks and keep each click as a step then you need to
determine any combination of keys as shortcut to your steps, so you could execute the steps whenever with that shortcut.

There is not any steps for **script shortcuts** and its easy. You just need to write/copy your code in the specified
field
then assign a shortcut to your code. Your code will add to the site and execute when the keys triggered.

**Notice:**

- It works only on websites.
- Shortcuts would trigger just when the focus is on the site itself.
- You need to trigger shortcuts on which page you define otherwise it will not find the target elements of its steps.
- You can't override some browser-reserved keyboard shortcuts. e.g `ctrl + t`, `ctrl + n`, `ctrl + shift + n`,
  `ctrl + w`, `ctrl + shift + n` and a few other keys.

Because of the special event handling in some sites Keyboard Shortcuts for Websites may not work properly,
but we will continue to improve features and fix bugs.
