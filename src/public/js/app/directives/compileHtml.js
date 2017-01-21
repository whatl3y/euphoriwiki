export { compileHtml as default }

function compileHtml($sce, $parse, $compile) {
  return {
    link: function(scope,element,attr){
      var parsed = $parse(attr.compileHtml);
      function getStringValue() { return (parsed(scope) || '').toString(); }
      scope.$watch(getStringValue, function (value) {
        var el = $compile($sce.getTrustedHtml(parsed(scope)) || '')(scope);
        element.empty();
        element.append(el);
      });
    }
  };
}
