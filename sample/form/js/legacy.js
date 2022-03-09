function onLoadUnavailable (event) {
    document.body.removeChild(document.getElementById('available'));
    document.getElementById('unavailable').className = 'view';
};
if (window.addEventListener) {
    window.addEventListener('load', onLoadUnavailable, false);
} else {
    window.attachEvent('onload', onLoadUnavailable);
}