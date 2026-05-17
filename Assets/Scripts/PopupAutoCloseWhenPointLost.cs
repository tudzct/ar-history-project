using UnityEngine;

public class PopupAutoCloseWhenPointLost : MonoBehaviour
{
    [Header("References")]
    public Camera arCamera;
    public BattlePopupManager popupManager;

    [Header("Settings")]
    public float margin = 0.05f;

    private Transform currentTargetPoint;
    private bool popupOpened = false;

    void Start()
    {
        if (arCamera == null)
            arCamera = Camera.main;

        if (popupManager == null)
            popupManager = FindObjectOfType<BattlePopupManager>();
    }

    void Update()
    {
        if (!popupOpened || currentTargetPoint == null || arCamera == null)
            return;

        if (!IsTargetVisible(currentTargetPoint))
        {
            ClosePopup();
        }
    }

    public void OpenPopupForPoint(Transform point)
    {
        currentTargetPoint = point;
        popupOpened = true;
    }

    public void ClosePopup()
    {
        popupOpened = false;
        currentTargetPoint = null;

        if (popupManager != null)
        {
            popupManager.ClosePopup();
        }
        else
        {
            Debug.LogWarning("Không tìm thấy BattlePopupManager.");
        }
    }

    private bool IsTargetVisible(Transform target)
    {
        Vector3 viewportPos = arCamera.WorldToViewportPoint(target.position);

        bool inFrontOfCamera = viewportPos.z > 0;

        bool insideScreen =
            viewportPos.x >= -margin &&
            viewportPos.x <= 1 + margin &&
            viewportPos.y >= -margin &&
            viewportPos.y <= 1 + margin;

        return inFrontOfCamera && insideScreen;
    }
}