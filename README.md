# My music server

Just a music server, so chill, even the performance is taking a break. (it's not that bad, though).
Yep, **SKILL ISSUE**!

![](/assets/naive-demo.png)

## Development

```sh
pnpm i
copy .env.example .env
pnpnm db:push
pnpm dev
```

Sorry if it's not working for you (but normally it should work if you have `node` and `pnpm`).
JK, I'll try to make it work for everyone (one day).

> At this point I don't even know why am I writing this, I'm the only one who's gonna use this anyway.

### Features

- [x] Serve music files with metadata, use `graphql`
- [x] Serve album art
- [x] Watch music files changes and update the database

#### TODO

- [ ] Refactor the code, because it's a mess. I just want to make it work first. (I might never do this, **AGAIN, SKILL ISSUE**)
- [ ] Add more query options, allow sorting, filtering, etc
- [ ] Improve the performance, yes I know it's should be the first thing to do, but as I said, it's not that bad
- [ ] Other stuffs that I haven't thought of yet
