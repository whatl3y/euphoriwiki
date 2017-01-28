export default class MainHomeController {
  constructor($scope, $http) {
    this._scope = $scope
    this._http = $http

    this._scope.newPage = this.newPage.bind(this)

    this.init()
  }

  init() {
    const self = this
    const loader = new Core.Modals().asyncLoader({message:"Loading wiki page information..."});
    this._http.post('/mainhome',{type:"initialize"})
    .success(function(ret) {
      if (!ret.success) {
        self._scope.error = ret.error;
      } else {
        self._scope.widgets = ret.widgets;
        self._scope.categories = ret.categories;
      }
      loader.remove();
    })
    .error(function(data,err) {
      console.log(data,err)
      loader.remove()
    })
  }

  newPage(path) {
    path = path || "";
    if (path.length) {
      location.href = (path[0] == "/") ? path.substring(1) : path;
    } else {
      this._scope.newPageError = "Please enter something for the path in order to navigate to that new page.";
    }
  }
}
