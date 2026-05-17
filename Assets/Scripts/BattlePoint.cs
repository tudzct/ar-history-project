using UnityEngine;
using UnityEngine.Video;

public class BattlePoint : MonoBehaviour
{
    [Header("Battle Info")]
    public string battleName;

    [TextArea(5, 12)]
    public string description;

    public VideoClip videoClip;

    private BattlePopupManager popupManager;
    private PopupAutoCloseWhenPointLost autoCloseManager;

    private void Awake()
    {
        popupManager = FindObjectOfType<BattlePopupManager>();
        autoCloseManager = FindObjectOfType<PopupAutoCloseWhenPointLost>();
    }

    private void OnMouseDown()
    {
        OpenPopup();
    }

    public void OpenPopup()
    {
        if (popupManager == null)
            popupManager = FindObjectOfType<BattlePopupManager>();

        if (autoCloseManager == null)
            autoCloseManager = FindObjectOfType<PopupAutoCloseWhenPointLost>();

        if (popupManager != null)
        {
            popupManager.ShowPopup(this);
        }
        else
        {
            Debug.LogWarning("Không tìm thấy BattlePopupManager trong scene.");
        }

        if (autoCloseManager != null)
        {
            autoCloseManager.OpenPopupForPoint(transform);
        }
        else
        {
            Debug.LogWarning("Không tìm thấy PopupAutoCloseWhenPointLost trong scene.");
        }
    }
}