# Release process

_For maintainers of this monorepo._

All packages in this monorepo will be published to NPM when a new release is created. They'll all share the same
version number. To create a new release:

1. Select "Draft a new release" from [the repository's "Releases"
   tab](https://github.com/scratchfoundation/scratch-editor/releases) or "Create a new release" from [the main page of
   the repository](https://github.com/scratchfoundation/scratch-editor/).
2. To create a tag for the release, select the **Choose a tag** dropdown menu, type a version number for your release,
   then click **Create new tag**. The tag of the release is used to determine and update package versions.
3. In the **Describe this release** field, type a description for your release. If you @mention anyone in the
   description, the published release will include a Contributors section with an avatar list of all the mentioned
   users. Alternatively, you can automatically generate your release notes by clicking **Generate release notes**.
   This provides a list with the **Pull Requests** included in the release and their creators.
4. Clicking **Publish release** triggers the publishing workflow that will publish the monorepo packages to NPM.
