$(document).ready(function () {
    $('#register').on('click', function () {
        $('#register-tab').show(1000);
        $('#login-tab').hide();
    });

    $('#login').on('click', function () {
        $('#login-tab').show(1000);
        $('#register-tab').hide();
    });

    $('#login-form').on('submit', function () {
        window.location.href = 'index.html';
    });
});
