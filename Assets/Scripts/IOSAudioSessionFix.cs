using System.Runtime.InteropServices;
using UnityEngine;

public class IOSAudioSessionFix : MonoBehaviour
{
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void SetIOSAudioSessionPlayback();
#endif

    void Start()
    {
#if UNITY_IOS && !UNITY_EDITOR
        SetIOSAudioSessionPlayback();
#endif
    }
}