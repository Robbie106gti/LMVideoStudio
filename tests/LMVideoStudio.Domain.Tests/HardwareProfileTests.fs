namespace LMVideoStudio.Domain.Tests

open Xunit
open FsUnit.Xunit
open LMVideoStudio.Domain

module HardwareProfileTests =
    [<Fact>]
    let ``defaultProfile is Standard`` () =
        HardwareProfile.defaultProfile |> should equal Standard

    [<Fact>]
    let ``vramBudgetGb Minimal is 8 GB`` () =
        HardwareProfile.vramBudgetGb Minimal |> should equal 8.0

    [<Fact>]
    let ``vramBudgetGb Standard is 16 GB`` () =
        HardwareProfile.vramBudgetGb Standard |> should equal 16.0

    [<Fact>]
    let ``vramBudgetGb High is 24 GB`` () =
        HardwareProfile.vramBudgetGb High |> should equal 24.0

    [<Fact>]
    let ``label Minimal includes 8 GB`` () =
        HardwareProfile.label Minimal |> should equal "Minimal (8 GB)"

    [<Fact>]
    let ``label Standard includes 16 GB`` () =
        HardwareProfile.label Standard |> should equal "Standard (16 GB)"

    [<Fact>]
    let ``label High includes 24 GB`` () =
        HardwareProfile.label High |> should equal "High (24 GB+)"
