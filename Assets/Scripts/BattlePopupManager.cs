using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Video;
using TMPro;

public class BattlePopupManager : MonoBehaviour
{
    public GameObject popupPanel;
    public TextMeshProUGUI titleText;
    public TextMeshProUGUI descriptionText;
    public Button closeButton;

    [Header("Video")]
    public VideoPlayer videoPlayer;
    public GameObject videoScreen;

    private void Start()
    {
        popupPanel.SetActive(false);
        closeButton.onClick.AddListener(Close);
    }

    public void Open(BattlePoint point)
    {
        titleText.text = point.battleName;
        descriptionText.text = point.description;

        popupPanel.SetActive(true);

        if (point.videoClip != null)
        {
            videoScreen.SetActive(true);

            videoPlayer.Stop();
            videoPlayer.clip = point.videoClip;
            videoPlayer.time = 0;

            videoPlayer.Prepare();
            videoPlayer.prepareCompleted += OnVideoPrepared;
        }
        else
        {
            videoScreen.SetActive(false);
        }
    }

    private void OnVideoPrepared(VideoPlayer source)
    {
        videoPlayer.prepareCompleted -= OnVideoPrepared;
        videoPlayer.Play();
    }

    public void Close()
    {
        videoPlayer.Stop();
        popupPanel.SetActive(false);
    }
}