#!/bin/bash

# Claude Code Notification Hook
# Claudeが質問したり止まったときに通知を送る
# stdin経由でJSONデータを受け取る

# Read JSON from stdin
INPUT=$(cat)

# jqがあればJSONをパース
if command -v jq &> /dev/null; then
    HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
    TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
    NOTIFICATION_TYPE=$(echo "$INPUT" | jq -r '.notification_type // ""')
    STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
    MESSAGE=$(echo "$INPUT" | jq -r '.message // ""')
else
    # jqがない場合はgrepでフォールバック
    HOOK_EVENT="unknown"
    TOOL_NAME=""
    NOTIFICATION_TYPE=""
    STOP_HOOK_ACTIVE="false"
    MESSAGE=""
fi

# macOS通知を送る関数
send_notification() {
    local title="$1"
    local message="$2"
    local sound="${3:-Glass}"

    # osascriptで通知を送信
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\"" 2>/dev/null

    # 追加でサウンドを再生（より目立つ通知）
    afplay "/System/Library/Sounds/${sound}.aiff" 2>/dev/null &
}

# ログに記録
log_notification() {
    local message="$1"
    local log_file="${CLAUDE_PROJECT_DIR:-.}/.claude/notifications.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [$HOOK_EVENT] $message" >> "$log_file" 2>/dev/null
}

case "$HOOK_EVENT" in
    "Stop")
        # 無限ループ防止：stop_hook_activeがtrueならスキップ
        if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
            exit 0
        fi
        send_notification "Claude Code" "処理が完了しました。確認してください。" "Hero"
        log_notification "処理完了"
        ;;

    "Notification")
        case "$NOTIFICATION_TYPE" in
            "permission_prompt")
                send_notification "Claude Code" "許可が必要です" "Ping"
                log_notification "許可要求: $MESSAGE"
                ;;
            "idle_prompt")
                send_notification "Claude Code" "入力待ちです" "Glass"
                log_notification "入力待ち: $MESSAGE"
                ;;
            *)
                if [ -n "$MESSAGE" ]; then
                    send_notification "Claude Code" "$MESSAGE" "Glass"
                    log_notification "$MESSAGE"
                fi
                ;;
        esac
        ;;

    "PostToolUse")
        if [ "$TOOL_NAME" = "AskUserQuestion" ]; then
            send_notification "Claude Code" "質問があります。確認してください。" "Ping"
            log_notification "質問: AskUserQuestion"
        fi
        ;;
esac

exit 0
