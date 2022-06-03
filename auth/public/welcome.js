document.addEventListener('DOMContentLoaded', bindButton);

async function bindButton() {
    try {
        const response = await fetch('/randomState', { method: 'GET' });
        const data = await response.json();
        let url = data.oauth_url;
        console.log(url);
        document.getElementById('begin').setAttribute('href', url);
        document.getElementById('begin').setAttribute('disabled', false);
    } catch (err) {
        console.log(err);
    }
}