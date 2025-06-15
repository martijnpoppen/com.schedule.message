const tabs = document.querySelectorAll('.tab');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach((t) => t.classList.remove('active'));
        contents.forEach((c) => c.classList.remove('active'));

        // Add active class to clicked tab and its content
        tab.classList.add('active');
        document.getElementById('tab-content-' + tab.dataset.tab).classList.add('active');
        document.querySelector('.tab-title').innerHTML = Homey.__(`settings.${tab.dataset.title_i18n}`)
    });
});
