<?php
ini_set('display_errors', 0);
error_reporting(0);
session_start();
session_regenerate_id(true);
$ip = $_SERVER['REMOTE_ADDR'];
if (!isset($_SESSION['rate_limit'])) $_SESSION['rate_limit'] = [];
$_SESSION['rate_limit'][] = time();
$_SESSION['rate_limit'] = array_filter($_SESSION['rate_limit'], fn($t) => $t > time()-60);
if (count($_SESSION['rate_limit']) > 20) { http_response_code(429); die('Too many requests'); }
function is_proxy() {
    $proxy_headers = ['HTTP_VIA','HTTP_X_FORWARDED_FOR','HTTP_CLIENT_IP','HTTP_FORWARDED','HTTP_PROXY_CONNECTION'];
    foreach ($proxy_headers as $header) if (isset($_SERVER[$header])) return true;
    return false;
}
if (is_proxy()) die('Proxy/VPN not allowed');
$ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
if (preg_match('/selenium|puppeteer|headless|phantom|curl|python|scrapy|bot|spider/', $ua)) die('Automation detected');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!$csrf || $csrf !== ($_SESSION['csrf_token'] ?? '')) die('CSRF check failed');
    unset($_SESSION['csrf_token']);
}
if (!isset($_SESSION['fail_count'])) $_SESSION['fail_count'] = 0;
if ($_SESSION['fail_count'] > 10) die('Too many failed attempts');
function safe_query($conn, $query, $params, $types) {
    $stmt = $conn->prepare($query);
    if ($params && $types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    return $stmt->get_result();
}
if (!isset($_SESSION['user_agent'])) $_SESSION['user_agent'] = $ua;
if ($_SESSION['user_agent'] !== $ua) die('Session hijack detected');
function log_attempt($msg) {
    file_put_contents(__DIR__.'/hack_attempts.log', date('c')." - ".$msg."\n", FILE_APPEND);
}
if (!isset($_SESSION['last_data_hash'])) $_SESSION['last_data_hash'] = '';
$data_hash = hash('sha256', json_encode($_POST));
if ($_SESSION['last_data_hash'] === $data_hash) die('Duplicate data');
$_SESSION['last_data_hash'] = $data_hash;
if (!empty($_FILES)) {
    foreach ($_FILES as $file) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($ext, ['jpg','png','gif','pdf','txt']) || !in_array($mime, ['image/jpeg','image/png','image/gif','application/pdf','text/plain'])) {
            die('Invalid file type');
        }
    }
}
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');