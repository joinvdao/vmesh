# Livestream Notes

vmesh is built in public with the VDAO.io community on X: [@joinvdao](https://x.com/joinvdao).

Weekly build livestream:

- Day: Thursday
- Time: 5pm UTC
- Channel: [https://x.com/joinvdao](https://x.com/joinvdao)

This document is the public build log. Add notes after each livestream when decisions, demos, implementation work, or follow-up tasks are safe to share publicly.

## How To Add Notes

1. Add a new dated entry under `Notes`.
2. Keep notes public-safe: no private planning context, personal contact details, secrets, local paths, or sensitive provider details.
3. Link related GitHub Issues, Pull Requests, or commits.
4. Move concrete follow-up work into public GitHub Issues using the Livestream Follow-Up or Engineering Task template.

## Entry Template

```md
### YYYY-MM-DD

**Theme:** Short public title.

**Built Or Demoed**

- **Decisions**

- **Open Questions**

- **Follow-Up Issues**

- #
```

## Notes

### 2026-04-30

**Theme:** Public V1 foundation and community repo preparation.

**Built Or Demoed**

- vmesh V1 dashboard shell with globe-first layout, mock H3 mesh data, selected-hex panel, analytics strip, and local user-record flow.
- Open terrain provider foundation for raster-dem TileJSON, XYZ/Terrarium, PMTiles/Mapterhorn, API DEM, dataset DEM, and STAC-style future discovery.
- Public repository safety pass with MIT license, VDAO.io community context, GitHub Issues workflow, and privacy checks.

**Decisions**

- GitHub Issues are the public ticket system.
- Private planning systems stay outside the public repository.
- Livestream notes live in `docs/LIVESTREAM.md` when safe to publish.

**Open Questions**

- How dense should the first active public mesh overlay be for V1?
- Which open parcel and terrain sources should be prioritized first?

**Follow-Up Issues**

- Create public issues after the repository is published.
