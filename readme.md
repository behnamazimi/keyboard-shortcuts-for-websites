# Keyboard Shortcuts for Websites

**[Chrome Web Store](https://chrome.google.com/webstore/detail/dgigbgdgmhhncfgaidcbmafkcmagkool)**

With **Keyboard Shortcuts for Websites**, you can have custom keyboard shortcuts for certain actions of websites you
use frequently.
As keyboard shortcuts, you can specify any key combination. Here are some examples:

- `ctrl + shift + e`
- `alt + ctrl + shift + u`
- `shift + %`
- `a + b`
- `1 + 2 + k`
- `p`

Keys determination is order sensitive, it means the same pressed keys in different orders would consider as two
different shortcuts. e.g `a + b + c` is not same as `c + b + a`.

### How to install?

It's available
on **[Chrome Web Store](https://chrome.google.com/webstore/detail/dgigbgdgmhhncfgaidcbmafkcmagkool)**.

### How to install it manually on Chromium base browsers?

1. Clone the repo or download it as a zip and extract it
2. Go to extensions settings of your browser and active **Developer mode** by clicking the toggle that is already in the
   extensions page. (You can also open extensions' page by going to `chrome://extensions` or `edge://extensions` for
   Edge or, `opera://extensions` for Opera browser)
3. At the same page, click on **Load unpacked** button and load the folder you just cloned or the zip
   file you have downloaded.
4. Enjoy! :)

### How It Works

By adding a **click shortcut** this extension listen to your clicks and keep track of your click steps then, you have to
determine any combination of keys as shortcut to your steps, and then you would be able to execute the steps by using
that shortcut.

You can prevent shortcuts execution on input focus. For this there is a global option on the settings page also, you can
do this for each individually by activating the option, "Prevent when focused on an input" on shortcut add flow.

**For Your Information:**

- It works only on websites.
- Shortcuts would trigger just when the focus is on the site itself.
- You need to trigger shortcuts on which page you define otherwise it will not find the target elements of its steps.
- You can't override some browser-reserved keyboard shortcuts. e.g `ctrl + t`, `ctrl + n`, `ctrl + shift + n`,
  `ctrl + w`, `ctrl + shift + n` and a few other keys.
- The name of the extension changed from "In-site Shortcuts" to "Keyboard Shortcuts for Websites"
- Because of new policies, it's impossible to inject Javascript codes and run it on a website, so I decided to remove
  the functionality of adding shortcuts for executing scripts which was available on previous version.

Because of the special event handling in some sites Keyboard Shortcuts for Websites may not work properly,
but we will continue to improve features and fix bugs.
