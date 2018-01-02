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

const srcList = [ "src/+(libs|passport_strategies|routes)/**/*.js", "src/*.js" ]

gulp.task('src-dev', function () {
  return gulp.src(srcList)
    .pipe(plumber())
    .pipe(babel())
    .pipe(gulp.dest("./"))
})

gulp.task('src-prod', function () {
  return gulp.src(srcList)
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(babel())
    .pipe(uglify().on('error', console.log))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest("./"))
})

gulp.task('app-extras', function () {
  return gulp.src("./src/public/js/extras/*.js")
    .pipe(sourcemaps.init())
    .pipe(plumber())
    .pipe(concat('app.min.extras.js'))
    .pipe(babel())
    .pipe(uglify().on('error', console.log))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./public/js'))
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
  return gulp.src([
    './src/public/sass/**/*.scss',
    './src/public/sass/**/*.css'
  ])
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('master.css'))
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

gulp.task('prep-always', [ 'app-extras', 'app', 'styles', 'fonts' ], function() {})

gulp.task('prep-dev', [ 'src-dev', 'prep-always' ], function() {})
gulp.task('prep-prod', [ 'src-prod', 'prep-always' ], function() {})
