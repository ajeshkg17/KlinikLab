// Windows DXGI adapter LUID independent of Vulkan's reported adapter name.
// Typed COM IDXGIFactory1/IDXGIAdapter1: no foreground access or GPU workload.
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
namespace KlinikLab {
 [StructLayout(LayoutKind.Sequential)] public struct NativeLuid {
  public uint LowPart; public int HighPart;
 }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
 public struct NativeAdapterDesc1 {
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string Description;
  public uint VendorId,DeviceId,SubSysId,Revision;
  public UIntPtr DedicatedVideoMemory,DedicatedSystemMemory,SharedSystemMemory;
  public NativeLuid AdapterLuid;
  public uint Flags;
 }
 [ComImport,Guid("29038f61-3839-4626-91fd-086879011a05"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 public interface INativeDxgiAdapter1 {
  void SetPrivateData(ref Guid name,uint size,IntPtr data);
  void SetPrivateDataInterface(ref Guid name,IntPtr unk);
  void GetPrivateData(ref Guid name,ref uint size,IntPtr data);
  void GetParent(ref Guid iid,out IntPtr parent);
  void EnumOutputs(uint index,out IntPtr output);
  void GetDesc(out IntPtr desc);
  void CheckInterfaceSupport(ref Guid guid,out long version);
  void GetDesc1(out NativeAdapterDesc1 desc);
 }
 [ComImport,Guid("770aae78-f26f-4dba-a829-253c83d1b387"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 public interface INativeDxgiFactory1 {
  void SetPrivateData(ref Guid name,uint size,IntPtr data);
  void SetPrivateDataInterface(ref Guid name,IntPtr unk);
  void GetPrivateData(ref Guid name,ref uint size,IntPtr data);
  void GetParent(ref Guid iid,out IntPtr parent);
  void EnumAdapters(uint index,out IntPtr adapter);
  void MakeWindowAssociation(IntPtr hwnd,uint flags);
  void GetWindowAssociation(out IntPtr hwnd);
  void CreateSwapChain(IntPtr device,IntPtr description,out IntPtr swapchain);
  void CreateSoftwareAdapter(IntPtr module,out IntPtr adapter);
  [PreserveSig] int EnumAdapters1(uint index,out INativeDxgiAdapter1 adapter);
  [return:MarshalAs(UnmanagedType.Bool)] bool IsCurrent();
 }
 public sealed class DxgiAdapterRecord {
  public string name {get;set;}
  public string luid {get;set;}
  public uint vendorId {get;set;}
  public uint deviceId {get;set;}
  public string evidenceSource {get;set;}
 }
 public static class DxgiEvidence {
  [DllImport("dxgi.dll",EntryPoint="CreateDXGIFactory1",PreserveSig=true)]
  private static extern int CreateFactory(ref Guid iid,[MarshalAs(UnmanagedType.Interface)] out INativeDxgiFactory1 factory);
  public static string Normalize(uint high,uint low) {
   return "0x"+high.ToString("x8")+"_0x"+low.ToString("x8");
  }
  public static string FromGpuEnginePath(string path) {
   if(path==null)return "";
   int start=path.IndexOf("_luid_",StringComparison.OrdinalIgnoreCase);
   if(start<0)return "";
   start+=6;
   int end=path.IndexOf("_phys_",start,StringComparison.OrdinalIgnoreCase);
   if(end<0)return "";
   string[] parts=path.Substring(start,end-start).Split('_');
   if(parts.Length!=2)return "";
   uint hi,lo;
   var style=System.Globalization.NumberStyles.HexNumber;
   var inv=System.Globalization.CultureInfo.InvariantCulture;
   if(!uint.TryParse(parts[0].Replace("0x",""),style,inv,out hi))return "";
   if(!uint.TryParse(parts[1].Replace("0x",""),style,inv,out lo))return "";
   return Normalize(hi,lo);
  }
  public static DxgiAdapterRecord[] Enumerate() {
   var output=new List<DxgiAdapterRecord>();
   var iid=new Guid("770aae78-f26f-4dba-a829-253c83d1b387");
   INativeDxgiFactory1 factory=null;
   int hr=CreateFactory(ref iid,out factory);
   if(hr<0||factory==null)Marshal.ThrowExceptionForHR(hr);
   try{
    for(uint i=0;i<32;i++){
     INativeDxgiAdapter1 adapter=null;
     hr=factory.EnumAdapters1(i,out adapter);
     if(hr==unchecked((int)0x887A0002))break; // DXGI_ERROR_NOT_FOUND
     if(hr<0)Marshal.ThrowExceptionForHR(hr);
     if(adapter==null)throw new InvalidOperationException("DXGI returned null adapter");
     try {
      NativeAdapterDesc1 desc; adapter.GetDesc1(out desc);
      output.Add(new DxgiAdapterRecord{
       name=desc.Description,vendorId=desc.VendorId,deviceId=desc.DeviceId,
       luid=Normalize(unchecked((uint)desc.AdapterLuid.HighPart),desc.AdapterLuid.LowPart)
      });
     } finally{Marshal.ReleaseComObject(adapter);}
    }
   } finally{Marshal.ReleaseComObject(factory);}
   return output.ToArray();
  }
 }
}
