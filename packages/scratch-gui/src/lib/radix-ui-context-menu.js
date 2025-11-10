/* eslint-disable import/no-unresolved */
/*
    https://github.com/import-js/eslint-plugin-import/issues/1810
    eslint-plugin-import is not aware of exports definition in package.json
    meaning we should disable linting for this import or use require instead
    moved the import in a separate file so that the disabling happens in one place only
*/
import * as ContextMenu from '@radix-ui/react-context-menu';

export default ContextMenu;
