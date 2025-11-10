export const getProjectTitleFromFilename = fileInputFilename => {
    if (!fileInputFilename) return '';
    // only parse title with valid scratch project extensions
    // (.sb, .sb2, and .sb3)
    const matches = fileInputFilename.match(/^(.*)\.sb[23]?$/);
    if (!matches) return '';
    return matches[1].substring(0, 100); // truncate project title to max 100 chars
};
