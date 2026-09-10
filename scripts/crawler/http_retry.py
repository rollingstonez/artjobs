# http_retry.py — HTTP 요청 재시도 도우미 (바로쌤 scripts/crawler/http_retry.py 이식)
#
# 외부 사이트가 잠깐 느리거나(ReadTimeout) 연결이 끊기면 크롤 전체가 죽어
# 하루치 수집이 통째로 실패하는 문제를 막는다. "일시적" 실패에 한해 같은 요청을
# 몇 번 더 시도한다.
#
# 사용법:
#   from http_retry import _retry
#   r = _retry(requests.get, LIST_URL, headers=..., params=..., timeout=20)
#
# 동작:
#   - 예외(타임아웃·연결 끊김 등) → 잠깐 쉬고 재시도. 기본 3번, 대기 5초→10초.
#   - 502·503·504(게이트웨이 일시 오류)도 같은 방식으로 재시도.
#   - 마지막 시도까지 실패하면 원래 예외/응답을 그대로 올린다 → 호출 쪽의
#     raise_for_status()/개별 처리가 종전과 똑같이 동작한다.
#   - 그 밖의 상태코드(404·500 등)에는 관여하지 않는다.

import time

RETRY_STATUSES = (502, 503, 504)


def _retry(fn, url, *, _tries=3, _wait=5, **kwargs):
    """fn(url, **kwargs)를 호출하되, 네트워크 오류·5xx 일시 오류 시 잠깐 쉬고 다시 시도한다."""
    for attempt in range(1, _tries + 1):
        try:
            r = fn(url, **kwargs)
        except Exception as e:
            if attempt >= _tries:
                raise
            reason = type(e).__name__
        else:
            status = getattr(r, "status_code", None)
            if status not in RETRY_STATUSES or attempt >= _tries:
                return r
            reason = f"HTTP {status}"
        wait = _wait * attempt
        print(f"[재시도] {url} — {attempt}회차 실패({reason}) → {wait}초 뒤 다시 시도", flush=True)
        time.sleep(wait)
