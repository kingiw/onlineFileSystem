
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
            } else if (data.msg) {
                alert(data.msg);
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
                alert("Successfully sign up. Please sign in.")
                location.href = "/signin"
            } else if (data.msg) {
                alert(data.msg);
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
    if ($('#selected_filename').text() === "You havn't select any files.")
        alert("Please select your file first.")
    else
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
    // let owner = $('#owner').text();
    let flag = Object.keys($('#isSharedIndex')).length;
    if (!flag) {
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


$('#newAuthorityBtn').click(function() {
    $('#newAuthorityModal').css('display', '');
})

$('#newAuthorityCancel').click(function() {
    $('#newAuthorityModal').css('display', 'none');
})

$('#newAuthorityConfirm').click(function() {
    let target = $('#newAuthorityModal > td > div > input').val();
    let authority = $('#newAuthorityModal .ui.dropdown').dropdown('get value');
    let dir_id = $('#dir_id').text();

    let usernameDOM = $('.username');
    usernames = []
    for (let i = 0; i < usernameDOM.length; ++i)
        usernames.push(usernameDOM.eq(i).text().trim());
    console.log(usernames);
    if (usernames.includes(target))
        alert('User\'s authority exists.');
    else 
        $.ajax({
            type: 'post',
            url: '/authority',
            data: {
                target: target,
                authority: authority,
                dir_id: dir_id
            },
            success: function(res){
                console.log(res);
                if (res.success == 0)
                    location.reload();
                else
                    alert(res.msg);
            }
        })
})

$('.authorityDropdown').dropdown('setting', 'onChange', function() {
    console.log($(this).dropdown('get value'));
    let authority = parseInt($(this).dropdown('get value'));
    let dir_id = $('#dir_id').text();
    console.log(dir_id);

})
