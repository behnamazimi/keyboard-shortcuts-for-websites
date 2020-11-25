# In-site Shortkeys

**[Chrome Web Store](https://chrome.google.com/webstore/detail/in-site-shortkeys/dgigbgdgmhhncfgaidcbmafkcmagkool)**

With **In-site Shortkeys**, you can define custom keyboard shortcuts for certain actions of websites you use frequently.
Also, it's possible to define shortcuts for executing scripts and, you can share script shortkeys with other sites.  

You can export your custom shortkeys and share it with your friend or your teammate.

For the shortcut, you can specify any key combination. Here are some examples of possibilities:
- `ctrl + shift + e`
- `alt + ctrl + shift + u`
- `shift + %`
- `a + b`
- `1 + 2 + k`
- `p`

Keys determination is order sensitive, it means the same pressed keys in different orders is completely
 different. e.g `a + b + c` is not same as `c + b + a`.
 
### How It Works
There is two type of shortkeys, **click shortkey** and **script shortkey**. 
When you want to add a **click shortkey** it will listen to your clicks and keep each click as a step then you need to 
determine any combination of keys as shortcut to your steps, so you could execute the steps whenever with that shortcut.

There is not any steps for **script shortkeys** and its easy. You just need to write/copy your code in the specified field
then assign a shortkey to your code. Your code will add to the site and execute when the keys triggered.

**Notice:**
- It works only on websites.
- Shortkeys would trigger just when the focus is on the site itself.
- You need to trigger shortkeys on which page you define otherwise it will not find the target elements of its steps.
- You can't override some browser-reserved keyboard shortcuts. e.g `ctrl + t`, `ctrl + n`, `ctrl + shift + n`,
 `ctrl + w`, `ctrl + shift + n` and a few other keys. 


Because of the special event handling in some sites In-site Shortkeys may not work properly, 
but we will continue to improve features and fix bugs.
