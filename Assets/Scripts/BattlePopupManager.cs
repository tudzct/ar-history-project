using UnityEngine;
using UnityEngine.Video;
using TMPro;
using UnityEngine.UI;

public class BattlePopupManager : MonoBehaviour
{
    [Header("UI")]
    public GameObject popupPanel;
    public TMP_Text titleText;
    public TMP_Text descriptionText;
    public ScrollRect descriptionScrollRect;
    public RectTransform descriptionContent;
    public RectTransform descriptionTextRect;

    [Header("Video")]
    public VideoPlayer videoPlayer;

    private BattlePoint currentPoint;

    public void ShowPopup(BattlePoint point)
    {
        if (point == null)
            return;

        if (popupPanel != null)
            popupPanel.SetActive(true);

        if (titleText != null)
            titleText.text = point.battleName;

        string desc = string.IsNullOrWhiteSpace(point.description)
            ? "(Chưa có mô tả)"
            : point.description;

        Debug.Log("Popup description length = " + desc.Length);

        if (descriptionText != null)
        {
            descriptionText.text = desc;
            descriptionText.enableWordWrapping = true;
            descriptionText.overflowMode = TextOverflowModes.Overflow;
            descriptionText.ForceMeshUpdate();

            Canvas.ForceUpdateCanvases();

            float viewportHeight = 200f;

            if (descriptionScrollRect != null && descriptionScrollRect.viewport != null)
                viewportHeight = descriptionScrollRect.viewport.rect.height;

            float preferredHeight = Mathf.Max(descriptionText.preferredHeight + 40f, viewportHeight + 10f);

            if (descriptionContent != null)
            {
                descriptionContent.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, preferredHeight);
            }

            if (descriptionTextRect != null)
            {
                descriptionTextRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, preferredHeight);
            }

            Canvas.ForceUpdateCanvases();

            if (descriptionScrollRect != null)
                descriptionScrollRect.verticalNormalizedPosition = 1f;
        }
        else
        {
            Debug.LogWarning("DescriptionText chưa được gán trong BattlePopupManager.");
        }

        if (videoPlayer != null && point.videoClip != null)
        {
            if (currentPoint != point || videoPlayer.clip != point.videoClip)
            {
                videoPlayer.Stop();
                videoPlayer.clip = point.videoClip;
                videoPlayer.Play();
            }
        }

        currentPoint = point;
    }

    public void ClosePopup()
    {
        currentPoint = null;

        if (videoPlayer != null)
        {
            videoPlayer.Stop();
            videoPlayer.clip = null;
        }

        if (popupPanel != null)
            popupPanel.SetActive(false);
    }
}