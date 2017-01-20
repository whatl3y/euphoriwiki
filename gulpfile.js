var gulp = require('gulp')
var babel = require('gulp-babel')
var concat = require('gulp-concat')
var replace = require('gulp-replace')
var minify_css = require('gulp-clean-css')
var sass = require('gulp-sass')
var sourcemaps = require('gulp-sourcemaps')
var plumber = require('gulp-plumber')
var uglify = require('gulp-uglify')
var webpack = require('webpack-stream')
var webpack_config = require('./webpack.config.js')

gulp.task('libs-dev', function () {
  return gulp.src("./src/libs/*.js")
    .pipe(babel())
    // .pipe(uglify().on('error', console.log))
    .pipe(gulp.dest("./libs"))
})

gulp.task('libs-prod', function () {
  return gulp.src("./src/libs/*.js")
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(babel())
    .pipe(uglify().on('error', console.log))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest("./libs"))
})

gulp.task('app', function () {
  return gulp.src("./src/public/js/*.js")
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(uglify().on('error', console.log))
    .pipe(webpack(webpack_config))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./public/js'))
})

gulp.task('styles', function() {
  return gulp.src('./src/public/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('mosaicjs-master.css'))
    .pipe(minify_css({ keepBreaks: true }))
    .pipe(gulp.dest('./public/css/'))
})

gulp.task('fonts', function() {
  return gulp.src([
    './src/public/fonts/**/*.{eof,eot,svg,ttf,woff,woff2}',
    './node_modules/bootstrap-sass/assets/fonts/**/*.{eof,eot,svg,ttf,woff,woff2}',
    './node_modules/font-awesome/fonts/**/*.{eof,eot,svg,ttf,woff,woff2}'
  ])
    .pipe(gulp.dest('./public/fonts/'))
})

gulp.task('prep-always', ['app', 'styles', 'fonts'], function() {})

gulp.task('prep-dev', ['libs-dev', 'prep-always'], function() {})
gulp.task('prep-prod', ['libs-prod', 'prep-always'], function() {})
