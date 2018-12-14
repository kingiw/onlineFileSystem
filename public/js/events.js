
$(document).ready(function() {
    
})


$(document).ready( function() {

});



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
