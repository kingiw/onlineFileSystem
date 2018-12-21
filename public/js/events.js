
$('.ui.dropdown').dropdown();

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
            if (data.success == 0)
                location.reload();
        },
        dataType: "json",
    });
})

$('#mkdircancel').click(function() {
    $('#newdirtr').css("display", "none"); 
})


$('.dir').click(function() {
    // Avoid double slash
    let username = window.location.pathname.split('/').slice(-1)[0];
    let owner = $('#owner').text();
    if (!owner) {
        let currentPath = $('#currentpath').text();
        let dirname = $(this).children(":first").text().trim();
        window.location.href = username + '?path=' + currentPath + dirname + '/';
    }
    else {
        let dir_id = $(this).attr("value").trim();
        window.location.href = username + '?path=' + dir_id;
    }
})

$('.file').click(function() {
    let dir_id = $('#dir_id').text();
    let file_id = $(this).attr("value");
    window.open('/download?path=' + dir_id + '/' + file_id);
    // $.ajax({
    //     type: 'POST',
    //     url: '/download',
    //     data: {
    //         dir_id: dir_id,
    //         file_id: file_id,
    //     },
    //     success: function(data) {
    //         console.log(data);
    //     },
    //     dataType: "json",
    // });
})

$('#manageAuthority').click(function() {
    let username = window.location.pathname.split('/').slice(-1)[0];
    let currentPath = $('#currentpath').text();
    location.href = 'manage/' + username + '?path=' + currentPath;
    // $.ajax({
    //     type: 'POST',
    //     url: '/manage/' + username,
    //     data: {
    //         dir_id: $('#dir_id').text()
    //     }
    // })
})

$('#share').click(function() {
    $('#sharemodal').css('display', '');
})

$('#authorityDropdown').dropdown('set selected', 1);
