using UnityEngine;

public class ARTapController : MonoBehaviour
{
    public Camera arCamera;
    public BattlePopupManager popupManager;

    void Update()
    {
        if (Input.touchCount == 0) return;

        Touch touch = Input.GetTouch(0);

        if (touch.phase != TouchPhase.Began) return;

        if (arCamera == null)
        {
            Debug.LogError("AR Camera is not assigned!");
            return;
        }

        if (popupManager == null)
        {
            Debug.LogError("Popup Manager is not assigned!");
            return;
        }

        Ray ray = arCamera.ScreenPointToRay(touch.position);

        if (Physics.Raycast(ray, out RaycastHit hit, 100f))
        {
            BattlePoint point = hit.collider.GetComponentInParent<BattlePoint>();

            if (point != null)
            {
                Debug.Log("Tapped battle point: " + point.battleName);
                popupManager.Open(point);
            }
        }
    }
}