const { src, parallel, series, dest, watch } = require('gulp');
const browserSync = require('browser-sync').create();
const sourcemaps = require('gulp-sourcemaps')
const sass = require('gulp-sass');
const autoprefixer = require('autoprefixer');
const concat = require('gulp-concat');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const cache = require('gulp-cache');
const del = require('rimraf');
const postcss = require('gulp-postcss');
const webpack = require('webpack-stream');
const rename = require('gulp-rename');
const pug = require('gulp-pug');
//const log = require('fancy-log');

var public_path = "public";

var webConfig =
{
    mode: "development",
    stats: 'errors-only',
    performance: { hints: false },
    output: { filename: 'app.js' },
    module: {
      rules: [
          {
            test: /\.(js)$/,
            loader: 'babel-loader',
            exclude: /(node_modules)/
          }
      ]
    }
};

function convert_to_html() {
  return src('src/html_compile/*.+(pug|jade)')
    .pipe(pug({ pretty: false }))
    .pipe(dest('src'));
}

function fonts() {
  return new Promise(function(resolve) {
    src('node_modules/font-awesome/fonts/*')
      .pipe(dest('src/fonts/FontAwesome'));
   resolve();
  });
}

function styles() {
  return src('src/sass/**/*.+(sass|scss)')
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('main.css'))
    .pipe(dest('src/styles'))
    .pipe(browserSync.stream());
}

function js() {
  return src('src/js/*.js')
    .pipe(webpack(webConfig))
    .pipe(dest('src/scripts'))
    .pipe(browserSync.stream());
}

function browserReload() {
    browserSync.init({
        server: { baseDir: "./src" },
        notify: false,
        open: false,
    });

    watch('src/js/*.js', js);
    watch('src/html_compile/**/*.+(pug|jade)', convert_to_html);
    watch('src/sass/**/*.+(sass|scss)', styles);
    watch("src/*.+(html|php)").on('change', browserSync.reload);
}

/** TO COMPILE */
function img() {
	return src('src/img/**/*')
		.pipe(cache(imagemin({
			interlaced: true,
			progressive: true,
			svgoPlugins: [{ removeViewBox: false }],
			use: [
        pngquant({
            quality: '70-90',
            speed: 1,
            floyd: 1,
        })
      ]
		})))
		.pipe(dest(`${public_path}/img`));
}

function setcss() {
  return src('src/styles/**/*.css')
    .pipe(sourcemaps.init())
      .pipe(postcss([
        autoprefixer({
          grid: true,
          overrideBrowserslist: ["ie >= 9", "> 1%"],cascade: false,
        })
      ]))
      .pipe(dest(`${public_path}/styles`))
      .pipe(rename("main.min.css"))
      .pipe(cleanCSS({ compatibility: 'ie9' }))
    .pipe(dest(`${public_path}/styles`))
}

function setjs() {
  webConfig.mode = "production";
  return src('src/js/*.js')
    .pipe(webpack(webConfig))
    .pipe(sourcemaps.init())
    .pipe(dest(`${public_path}/scripts`))
}

function collect() {
    return new Promise(function(resolve) {
        del.sync(public_path);
        src('src/libs/**/*').pipe(dest(`${public_path}/libs`));
        src('src/fonts/**/*').pipe(dest(`${public_path}/fonts`));
        src('src/*.+(html|php)').pipe(dest(public_path));
      resolve();
    });
}
/** END TO COMPILE */

exports.build = series(collect, setjs, setcss, img);
exports.default = parallel(fonts, styles, js, convert_to_html, browserReload);
exports.clear =()=> cache.clearAll();
/** use the "rimraf node_modules" for deleting */
