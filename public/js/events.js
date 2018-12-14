
$(document).ready(function() {
    
})


$('#loginbtn').click(function() {
    let username = $("input[name='username']").val();
    let password = $("input[name='password']").val();
    $.ajax({
        type: 'POST',
        url: '/signin',
        data: {
            username: username,
            password: password
        },
        success: function(data) {
            if (data.success == 0) {
                location.href = "/"
            } else {
                $(".error.message").css('display', 'block');
                $('.error.message').text(data.msg);
            }
        },
        dataType: "json",
    });
})

$('#signupbtn').click(function() {
    let username = $("input[name='username']").val();
    let password = $("input[name='password']").val();
    $.ajax({
        type: 'POST',
        url: '/signup',
        data: {
            username: username,
            password: password
        },
        success: function(data) {
            if (data.success == 0) {
                location.href = "/signin"
            } else {
                $(".error.message").css('display', 'block');
                $('.error.message').text(data.msg);
            }
        },
        dataType: "json",
    });
})

$('#falseinput').click(function(){
    $("#fileinput").click();
});

$('#fileinput').change(function() {
  $('#selected_filename').text($('#fileinput')[0].files[0].name);
});

$('#falseupload').click(function() {
    $("#doupload").click();
})

$('#makedirbtn').click(function() {
    console.log('...');
    $('#newdirtr').css("display", "");
})

$('#mkdirconfirm').click(function() {
    let name = $('#newdirname').val();
    let currentPath = $('#currentpath').text();
    $.ajax({
        type: 'POST',
        url: '/mkdir',
        data: {
            dirname: name,
            path: currentPath
        },
        success: function(data) {
            console.log(data);
        },
        dataType: "json",
    });
})

$('#mkdircancel').click(function() {
    $('#newdirtr').css("display", "none"); 
})


$(".file").click(() => {
    console.log($(this).text());
})
