# MASTER EDIT GUIDE

## One source of truth

Use this master project as the baseline for every future change.

## Common edits

### Birthday date
`js/config.js`
Change:
`birthday`

### YouTube video
`js/config.js`
Change only:
`youtubeVideo.url`

Set:
`youtubeVideo.enabled = false`
to hide the video.

### Birthday music
File:
`music/birthday.mp3`

The JavaScript music system lives in:
`js/main.js`

Keep one `#birthdayAudio` element per HTML page.

### Memory images
Folder:
`images/memories/`

Current mapping:
- memory-01.jpg
- memory-02.jpg
- memory-03.jpg
- memory-04.jpg
- our-journey.jpg

The mapping is defined in:
`js/media-data.js`

### Story images
Folder:
`images/story/`

Current mapping:
- chapter-01.jpg
- chapter-02.jpg
- chapter-03.jpg
- chapter-04.jpg

The text + mapping live in:
`js/media-data.js`

### Memory gallery behavior
`js/memories.js`

### Global site behavior
`js/main.js`

### Site styling
`css/style.css`

### Memories styling
`css/memories.css`

### Story styling
`css/story.css`

## Before any future release

1. Start from this master ZIP.
2. Make the smallest change necessary.
3. Run JavaScript syntax checks.
4. Run PHP syntax checks.
5. Check all HTML local asset references.
6. Open Home, Memories, Story, Surprise and Fun Zone manually on a real device.
7. Confirm music, navigation, lightbox, games and forms.
8. Keep the final ZIP as the new master.

Do not combine this project with an older ZIP.


## Khushie V2 final architecture

The final release is `Khushie-V2-FINAL.zip`. Phase 03–09 feature modules are intentionally page-specific and reuse the shared Phase 02 visual foundation, global navigation, music, countdown and progress systems.

Personal source media currently uses `.jpg` files, not `.png` files. Canvas export features may still generate `.png` downloads at runtime; those are user-created exports rather than project source assets.
