'use strict';

module.exports = function viewCounter (req, res, next) {
  var views = req.session.views;

  if (!views) {
    views = req.session.views = {};
  }

  var path = req.originalUrl;

  if (!views[path]) {
    views[path] = 0;
  }

  views[path] += 1;

  next();
};