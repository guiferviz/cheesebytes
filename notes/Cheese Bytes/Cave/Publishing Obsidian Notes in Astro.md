---
aliases:
  - Publishing Cheese Bytes
---

After a long _long_ **long** time collecting notes on programming and searching
for the perfect way to publish them, I have decided to stop wandering and
significantly narrow down what I want to have ready for the first version of my
online notes.

# Requirements

Refer to [[Requirements for a Note Publishing System]] for a comprehensive list
of features I would like a note publishing system to support.

# Discovering Astro JS

I recently discovered [[Astro JS]], a flexible, easy-to-use, and fast static
site generator. It meets all the requirements I mentioned earlier. However, it
took me some time to find this tool. You can read more about my journey and the
other tools I tried before settling on Astro in
[[My Journey to the Perfect Publishing Tool]].

# Minimum Viable Product

Since Astro meets all my needs and I have already spent too much time
procrastinating on publishing my notes, I am focusing on defining the minimum
requirements for my project to consider it published.

- **Generate HTML for Markdown notes:**
  - Convert Markdown notes (formatted for Obsidian) into visible and navigable
    HTML.
  - The content should render well with a basic style (minimally decent).
- **Responsive Configuration:**
  - Ensure the site looks good on both desktop and mobile devices.
- **Consistent URL Structure:**
  - URLs like `cheesebytes.com/<note>` or `giferviz.com/cheesebytes/<note>`.
  - They should not change with future updates or adjustments to avoid broken
    links.
- **Content Collections Integration:**
  - Configure Astro to recognize my notes in `content/notes/` and generate pages
    for each.
  - Collect tags (optional, if easy) and wikilinks (required, link format used
    in Obsidian Markdown) with a custom plugin.

# Days 1-2: Astro and Content Collections Setup

- [x] Using `IosevkaTermSlab Nerd Font`. We need to create a smaller version of
      the font to serve it over internet, 13MB are too much. We need to create a
      script that extracts just the needed chars. 📅 2025-04-05 ✅ 2025-04-05
- [x] Index page listing all notes and linking them with `a` tag. 📅 2025-04-05
      ✅ 2025-04-05
- [x] Basic markdown conversion of all notes. We should be able to see the
      markdown code transformed into a basic HTML page without rendering. 📅
      2025-04-05 ✅ 2025-04-05
- [x] Favicon with a cheese. 📅 2025-04-05 ✅ 2025-04-06
- [x] Wikilinks support. 📅 2025-04-06 ✅ 2025-04-06

* [x] Astro and content collection setup. 📅 2025-04-06 ✅ 2025-04-06

# Days 3-4: Style and Sidebar

- [x] Decide domain. --> `cheesebytes.com` (`guiferviz.com/cheesebytes` would
      redirect to `cheesebytes.com` too). I will create an about page in
      cheesebytes that links to `guiferviz.com` if someone wants to know more.
      📅 2025-04-11 ✅ 2025-04-11
- [x] Ensure that all notes load correctly with URLs like or
      `cheesebytes.com/my-note` or `cheesebytes.com/cave/my-note-in-cave`. No
      more levels are expected. 📅 2025-04-11 ✅ 2025-04-11
- [x] Functional sidebar with top level files and collapsible `The Cheese Cave`
      folder. 📅 2025-04-11 ✅ 2025-04-12
- [x] Sidebar visible from all pages. 📅 2025-04-11 ✅ 2025-04-12

* [x] Sidebar highlighting current page. 📅 2025-04-11 ✅ 2025-04-11

- [x] External links should have an icon indicating they are going to take you
      to a different page and they should be opened in a new tab. --> Plugin
      created to apply class to external links and using and SVG background in
      my CSS to show the icon. 📅 2025-04-12 ✅ 2025-04-12

* [x] Styling markdown generated code with tailwindcss. 📅 2025-04-12 ✅
      2025-04-12
* [x] No scrolling in sidebar, just in file tree. 📅 2025-04-12 ✅ 2025-04-13
* [x] Fix inline code: do not show backticks and add backgroud colour. 📅
      2025-04-13 ✅ 2025-04-13
* [x] Add note title to tab and heading. 📅 2025-04-12 ✅ 2025-04-13

- [x] Adjust title size and headers. 📅 2025-04-13 ✅ 2025-04-13
- [x] Add comments with Giscus. See [[Commenting System in Static Pages]]. 📅
      2025-04-13 ✅ 2025-04-13
- [x] Add logo in title. 📅 2025-04-13 ✅ 2025-04-13
- [x] Minimun style. 📅 2025-04-13 ✅ 2025-04-13

* [x] Publish with Github Pages and Github Action. 📅 2025-04-13 ✅ 2025-04-13

# Day 5-6: Fixing Post-Publish Issues

- [x] Fix page highlight. 📅 2025-04-18 ✅ 2025-04-18
- [x] Resizable and responsive side bar. 📅 2025-04-18 ✅ 2025-04-18
- [x] Graph visualization. 📅 2025-04-18 ✅ 2025-04-18
- [x] Dark/light theme selector. 📅 2025-04-18 ✅ 2025-04-18
- [x] Dark/light code blocks. 📅 2025-04-18 ✅ 2025-04-18
- [x] Dark/light Giscus comments. 📅 2025-04-18 ✅ 2025-04-18

With all the tasks above completed, we have our MVP ready! While it is not
perfect, it is finally published... [[Cheese Bytes]] is a reality now! 🤗

# To-Do for Future Iterations

Here is a list of tasks to focus on in the next iterations of this project:

- Expandable callouts.
- Ranking using fresh/medium/old cheeses.
- Marimo plugin.
- Tag support.
- List of linked pages: in and out links.
- ToC on right hand panel.
- Small graph in right hand panel.
- Improve content collection.
- Wikilinks with aliases.

I have created [[Cheese Bytes Enhancements - Project Journal]] to log progress
on these tasks and more, aiming to improve the user experience and satisfy my
new and whimsical ideas.
