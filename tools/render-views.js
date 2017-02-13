const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const pug = require('pug');
const moment = require('moment');
const md = require('markdown-it')({html: true, breaks: false, linkify: true});

/**
 * Initialize the parsing of the markdown files and conversion to HTML via pug
 */
function init() {
  const postsDirectoryInput = path.resolve(__dirname, '../src/markdown');
  const postsDirectoryOutput = path.resolve(__dirname, '../posts');

  const posts = getPostFilepaths(postsDirectoryInput)
    .map(getPostTimestamp)
    .map(getPostContentAsJSON)
    .map(parseMarkdown)
    .map(renderHTML)
    .sort(sortByCreationDate);
  
  posts.forEach(post => writePostToDisk(post, postsDirectoryOutput));

  const indexView = renderIndexView(posts);
  writeIndexViewToDisk(indexView);
}

/**
 * Get all files inside the given directory and get the name and path
 * @param {String} dirpath The path to the markdown source directory
 * @returns {Array} Object with name and path of a file
 */
function getPostFilepaths(dirpath) {
  return fs.readdirSync(dirpath).map(filename => {
    return {
      name: filename,
      path: path.join(dirpath, filename)
    };
  });
}

/**
 * Get the date timestamp of the first occurence of a file in GIT
 * @param {Object} post The post object
 * @returns {Object} Patched post object with a file creation timestamp
 */
function getPostTimestamp(post) {
  const command = `git log --format=%aD ${post.path} | tail -1`;
  const gitDate = new Date(execSync(command));
  const timestamp = gitDate.getTime();
  const humanReadableDate = moment(timestamp).format('MMM D, YYYY');
  return Object.assign({}, post, {timestamp, humanReadableDate});
}

/**
 * Get the headers, title and markdown from the post file
 * @param {Object} post Post object, contains name and path
 * @returns {Object} Patched post object with title and markdown
 */
function getPostContentAsJSON(post) {
  const file = fs.readFileSync(post.path, 'utf8');
  const markdownStart = file.indexOf('#');
  const headers = file.slice(0, markdownStart);
  const markdown = file.slice(markdownStart);
  const title = markdown.slice(2, markdown.indexOf('\n'));
  return Object.assign({}, post, {title, markdown});
}

/**
 * Parse markdown to HTML
 * @param {Object} post The post object
 * @returns {Object} The patched post object with the HTML content
 */
function parseMarkdown(post) {
  const content = md.render(post.markdown);
  return Object.assign({}, post, {content});
}

function renderHTML(post) {
  const template = path.resolve(__dirname, '../src/views/post.pug');
  const html = pug.renderFile(template, post);
  return Object.assign({}, post, {html});
}

/**
 * Sort the posts by newest creation timestamp (higher timestamp)
 * @param {Object} a First post
 * @param {Object} b Second post
 * @returns {Integer} The result
 */
function sortByCreationDate(a, b) {
  return b.timestamp - a.timestamp;
}

/**
 * Write the converted post to disk
 * @param {Object} post The post object
 * @param {String} dirpath The output directory path
 */
function writePostToDisk(post, dirpath) {
  const filepath = path.join(dirpath, `${post.name}.html`);
  fs.writeFileSync(filepath, post.html, 'utf8');
}

/**
 * Render the index view with a list of all posts
 * @param {Array} posts Contains all published posts
 * @returns {String} The HTML string of the index view
 */
function renderIndexView(posts) {
  const srcPath = path.resolve(__dirname, '../src/views/');
  const aboutPath = path.resolve(srcPath, 'components/about/about.txt');
  const aboutText = fs.readFileSync(aboutPath, 'utf8');
  const template = path.resolve(srcPath, 'index.pug');
  return pug.renderFile(template, {posts, aboutText});
}

/**
 * Write the index.html file to disk
 * @param {String} html The converted index view
 */
function writeIndexViewToDisk(html) {
  const destination = path.resolve(__dirname, '../index.html');
  fs.writeFileSync(destination, html, 'utf8');
}

init();
