$(document).ready( function() {

  $("form#login_form").validate({
    debug: true,
    submitHandler: function(form) {

      var sendData = $("form#login_form").serializeObject();
      //for (var key in sendData) sendData[key] = "a" + sendData[key];

      console.log("start submit");

      /* disable orgin event behavior */
      $.ajax({
        type: "POST" ,
        dataType: "json",
        data: sendData,
        url: '/test/login',
        success: function(data) {

          if (!data.accountDup) {

            console.log(data);

            if (data.succLogin) {
              document.location = data.redirectUrl;
              console.log(data.succLogin);
            } else {
              console.log(data.succLogin);
            }
          }            
        },
        error: function(error) {
          console.log("fail");
        }
      });

      return false;
      
    },
    rules: {
      account: {
        required: true
      },
      password: {
        required: true
      }
    },
    messages: {
      account: {
        required: "*請輸入帳號"
      },
      password: {
        required: "*請輸入稱呼"
      }
    },
    showErrors: function(errorMap, errorList) {
      console.log(errorMap);
      console.log($(errorList).each(function(){ console.log(this);}));
      $(errorList).each(function(){
        $(this.element).next(".myerror").text(this.message);
      });
      
      this.defaultShowErrors();
    },
    errorPlacement: function(error, element) {
      return true;
    },
    highlight: function(element, errorClass) {
      $(element).addClass("error-input");
      $(element).next(".myerror").removeClass("label-hide");
    },
    unhighlight: function(element, errorClass) {
      $(element).removeClass("error-input");
      $(element).next(".myerror").addClass("label-hide");
    }
  });

});