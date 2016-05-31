function adminTemplateMgmtCtrl($scope,$http,Upload) {
  $scope.templateConfigTypes = [
    {name:"File Upload", type:"file"},
    {name:"List", type:"list"},
    {name:"Select List", type:"select"},
    {name:"Text Area", type:"textarea"},
    {name:"Text Box", type:"textbox"}
  ];
  
  $scope.functions= {
    initialize: function() {
      this.ajax("init",null,function(err,data) {
        if (err) return console.log(err,data);
        
        $scope.templateTypes = data.templateTypes;
        $scope.templates = data.templates;
        $scope.externalDatasources = data.datasources || [];
        
        console.log(data);
      });
    },
    
    updateAryLength: function(scopeKey,which) {
      scopeKey = scopeKey || "";
      which = which || "inc";
      
      $scope[scopeKey] = $scope[scopeKey] || [];
      
      switch(which) {
        case "inc":
          $scope[scopeKey] = $scope[scopeKey].concat({});
          break;
          
        case "dec":
          $scope[scopeKey].pop();
          break;
      }
    },
    
    getTemplateTypeName: function(type) {
      return $scope.templateTypes.filter(function(t) {
        return t.key == type;
      }).map(function(t) {
        return t.name;
      })[0];
    },
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin/templates',Object.merge({type:type},(data || {})))
      .success(function(ret) {
        if (ret.success) cb(null,ret)
        else {
          cb(ret.error || "There was an issue processing your data. Please try again.");
        }
        
        loader.remove();
      })
      .error(function(data,err) {
        cb(err || "There was an issue processing your data. Please try again.",data);
        loader.remove();
      });
    }
  };
  
  $scope.handlers = {
    uploadFile: function(file,key) {
      $scope[key] = file;
    },
    
    editTemplate: function(oTemplate) {
      $scope.newTemplate = oTemplate;
      $scope.newTemplateConfig = $scope.newTemplate.config;
    },
    
    addOrEditTemplate: function(fileScopeKey) {
      var file = $scope[fileScopeKey] || null;
      $scope.newTemplate = $scope.newTemplate || {};
      
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      Upload.upload({
        url: '/admin/templates',
        file: file,
        fields: {
          type: "addOrEditTemplate",
          template: Upload.json($scope.newTemplate)
        }
      })
      .success(function(data) {
        if (data.success) {
          $scope.templates = $scope.templates || [];
          
          $scope.templates = $scope.templates.filter(function(t) {
            return t._id != $scope.newTemplate._id || false;
          });
          $scope.templates.push(data.template);
          
        } else {
          console.log(data);
          $scope.error = data.error || "There was a problem creating your template. Please try again.";
        }
        
        loader.remove();
      })
      .error(function(ret,_err) {
        console.log(ret,_err);
        $scope.error = "There was a problem creating your template. Please try again.";
        loader.remove();
      });
    },
    
    deleteTemplate: function(oTemplate) {
      if (confirm("Are you sure you want to delete this template? This template will be permanently deleted.")) {
        $scope.functions.ajax("deleteTemplate",{_id:oTemplate._id, file:oTemplate.file},function(err,data) {
          if (err || !data.success) return $scope.error = err || data.error;
          
          $scope.templates = $scope.templates.filter(function(t) {
            return t._id != oTemplate._id;
          });
        });
      }
    },
    
    updateListColumns: function(num,obj) {
      obj["listcols"] = obj["listcols"] || [];
      
      var a = [];
      for (var _i=0; _i<num; _i++) {
        var o = (typeof obj["listcols"][_i] === "undefined") ? {colName:""} : obj["listcols"][_i];
        a.push(o);
      }
      
      obj["listcols"] = a;
    }
  };
  
  $scope.functions.initialize();
}